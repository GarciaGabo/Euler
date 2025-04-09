import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

type Punto = { x: number; y: number };
type Funcion = (x: number, y: number) => number;

const loadHtml2Pdf = async (): Promise<void> => {
    if (typeof window !== 'undefined' && !(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject('No se pudo cargar html2pdf');
            document.body.appendChild(script);
        });
    }
};

export const generarPDF = async (
    funcion: string,
    x0: string,
    y0: string,
    h: string,
    xFinal: string,
    resultados: Punto[],
    funcionValida: Funcion | null,
    graficaUri: string | null,
    _htmlGrafico3D: string | null
) => {
    if (!resultados.length) {
        alert('Primero realiza un cálculo.');
        return;
    }

    const tablaHTML = resultados.slice(0, resultados.length - 1).map((p, i) => {
        const xn = p.x.toFixed(4);
        const yn = p.y.toFixed(6);
        let fxy = 0, yPred = 0, fNext = 0, yn1 = 0;
        const hNum = parseFloat(h);
        const xn1 = (p.x + hNum).toFixed(4);

        if (funcionValida) {
            try {
                fxy = funcionValida(p.x, p.y);
                yPred = p.y + hNum * fxy;
                fNext = funcionValida(p.x + hNum, yPred);
                yn1 = p.y + (hNum / 2) * (fxy + fNext);
            } catch (err) {
                console.error("Error evaluando función:", err);
            }
        }

        return `
      <tr>
        <td>${i}</td>
        <td>${xn}</td>
        <td>${yn}</td>
        <td>${isNaN(yPred) ? '-' : yPred.toFixed(6)}</td>
        <td>${xn1}</td>
        <td>${isNaN(yn1) ? '-' : yn1.toFixed(6)}</td>
      </tr>`;
    }).join('');

    const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { color: #6e57e0; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
          th { background-color: #f0f0f0; }
          .grafica-euler { display: block; width: 100%; height: auto; }
          .salto-pagina {
            page-break-before: always;
        }
        </style>
      </head>
      <body>
        <h1>Reporte - Método de Euler Mejorado</h1>
        <p><strong>Fecha de generación:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Función:</strong> ${funcion}</p>
        <p><strong>x₀:</strong> ${x0} &nbsp;&nbsp; <strong>y₀:</strong> ${y0}</p>
        <p><strong>h:</strong> ${h} &nbsp;&nbsp; <strong>x final:</strong> ${xFinal}</p>

        <h2>Tabla de Resultados</h2>
        <table>
          <thead>
            <tr><th>N</th><th>Xₙ</th><th>Yₙ</th><th>Yₙ₊₁*</th><th>Xₙ₊₁</th><th>Yₙ₊₁</th></tr>
          </thead>
          <tbody>${tablaHTML}</tbody>
        </table>

        ${graficaUri
            ? `<div class="salto-pagina"><h2>Gráfica</h2><img class="grafica-euler" src="${graficaUri}" alt="Gráfica generada" /></div>`
            : '<p style="color: red;">⚠️ No se pudo capturar la gráfica.</p>'}
      </body>
    </html>`;

    if (Platform.OS === 'web') {
        await loadHtml2Pdf();
        const fecha = new Date();
        const nombrePDF = `reporte-euler-${fecha.toLocaleDateString('es-MX').replace(/\//g, '-')}-${fecha.toLocaleTimeString('es-MX').replace(/[: ]/g, '-')}.pdf`;

        const existing = document.getElementById('pdf-container');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.id = 'pdf-container';
        container.innerHTML = html;
        document.body.appendChild(container);

        (window as any).html2pdf().from(container).set({
            margin: 10,
            filename: nombrePDF,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).save().then(() => {
            container.remove();
        });

        return;
    }

    const { uri: pdfUri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir reporte PDF',
        UTI: 'com.adobe.pdf',
    });
};
