import WebView from 'react-native-webview';
import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useState } from 'react';
import { evaluate } from 'mathjs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import Grafica2D from '@/components/grafica2D';
import { generarPDF } from '@/components/pdfGenerator';

type Punto = {
  x: number;
  y: number;
};

function eulerMejorado(
  f: (x: number, y: number) => number,
  x0: number,
  y0: number,
  h: number,
  xFinal: number
): Punto[] {
  const results: Punto[] = [{ x: x0, y: y0 }];
  let x = x0;
  let y = y0;

  while (x + h <= xFinal) {
    const fxy = f(x, y);
    const yPred = y + h * fxy;
    const fNext = f(x + h, yPred);
    y = y + (h / 2) * (fxy + fNext);
    x = x + h;
    results.push({ x, y });
  }

  if (x < xFinal) {
    const hFinal = xFinal - x;
    const fxy = f(x, y);
    const yPred = y + hFinal * fxy;
    const fNext = f(x + hFinal, yPred);
    y = y + (hFinal / 2) * (fxy + fNext);
    x = xFinal;
    results.push({ x, y });
  }

  return results;
}

export default function HomeScreen() {
  const [funcion, setFuncion] = useState<string>('2 * x * y');
  const [x0, setX0] = useState<string>('1');
  const [y0, setY0] = useState<string>('1');
  const [h, setH] = useState<string>('0.1');
  const [xFinal, setXFinal] = useState<string>('1.5');
  const [resultados, setResultados] = useState<Punto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { width } = useWindowDimensions();
  const [verGrafica3D, setVerGrafica3D] = useState(false);
  const [puntosEuler, setPuntosEuler] = useState<Punto[]>([]);
  const [funcionValida, setFuncionValida] = useState<((x: number, y: number) => number) | null>(null);
  const chartRef = useRef<any>(null);
  const [grafica3DUri, setGrafica3DUri] = useState<string | null>(null);

  const gradients: [string, string][] = [
    ['#6e57e0', '#3498db'],
    ['#3498db', '#2ecc71'],
    ['#2ecc71', '#6e57e0'],
  ];
  const [index, setIndex] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % gradients.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const validarEntradas = (): { valido: boolean; valores?: { x0: number, y0: number, h: number, xFinal: number } } => {
    const x0Num = parseFloat(x0);
    const y0Num = parseFloat(y0);
    const hNum = parseFloat(h);
    const xFinalNum = parseFloat(xFinal);

    if (!funcion.trim()) {
      alert('La función f(x, y) no puede estar vacía.');
      return { valido: false };
    }
    if (isNaN(x0Num)) {
      alert('x₀ debe ser un número válido.');
      return { valido: false };
    }
    if (isNaN(y0Num)) {
      alert('y₀ debe ser un número válido.');
      return { valido: false };
    }
    if (isNaN(hNum) || hNum <= 0) {
      alert('El valor de h debe ser un número mayor que 0.');
      return { valido: false };
    }
    if (isNaN(xFinalNum) || xFinalNum <= x0Num) {
      alert('x final debe ser mayor que x₀.');
      return { valido: false };
    }

    try {
      evaluate(funcion, { x: x0Num, y: y0Num });
    } catch (e) {
      alert('La función ingresada no es válida. Usa sintaxis como: 2 * x * y');
      return { valido: false };
    }

    return {
      valido: true,
      valores: { x0: x0Num, y0: y0Num, h: hNum, xFinal: xFinalNum },
    };
  };

  const calcular = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const validacion = validarEntradas();
    if (!validacion.valido) return;

    const { x0: x0Num, y0: y0Num, h: hNum, xFinal: xFinalNum } = validacion.valores!;

    const steps = Math.ceil((xFinalNum - x0Num) / hNum);
    if (steps > 1000) {
      alert('Demasiados pasos calculados. Ajusta h o xFinal.');
      return;
    }

    try {
      const f = (x: number, y: number): number => {
        const result = evaluate(funcion, { x, y });
        if (typeof result !== 'number' || isNaN(result)) {
          throw new Error('Resultado inválido');
        }
        return result;
      };

      setFuncionValida(() => f);

      const res = eulerMejorado(f, x0Num, y0Num, hNum, xFinalNum);
      const yInvalido = res.some(p => !isFinite(p.y) || Math.abs(p.y) > 1e6);
      if (yInvalido) {
        alert('La función produce valores muy grandes o infinitos.');
        return;
      }

      setResultados(res);

      const puntosEuler = res.slice(0, res.length - 1).map((p, i) => {
        const xn = p.x;
        const yn = p.y;
        const fxy = f(xn, yn);
        const yPred = yn + hNum * fxy;
        const fNext = f(xn + hNum, yPred);
        const yn1 = yn + (hNum / 2) * (fxy + fNext);
        const xn1 = xn + hNum;
        const z = evaluate(funcion, { x: p.x, y: p.y });
        return { x: xn1, y: yn1, z: z };
      });

      setPuntosEuler(puntosEuler);
    } catch (error) {
      alert('Hubo un error al evaluar la función. Verifica la sintaxis.');
    }
  };

  const crearPDF = async () => {
    let graficaUri: string | null = null;
  
    const finalizarPDF = async () => {
      await generarPDF(
        funcion,
        x0,
        y0,
        h,
        xFinal,
        resultados,
        funcionValida,
        graficaUri,
        null
      );
    };
  
    if (!verGrafica3D) {
      if (Platform.OS === 'web') {
        if (!(window as any).html2canvas) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = async () => {
            const div = document.getElementById('grafica2d-web');
            if (div && (window as any).html2canvas) {
              const canvas = await (window as any).html2canvas(div);
              graficaUri = canvas.toDataURL('image/png');
              await finalizarPDF();
            } else {
              alert('No se pudo capturar la gráfica 2D.');
            }
          };
          script.onerror = () => alert('Error al cargar html2canvas.');
          document.body.appendChild(script);
          return;
        } else {
          const div = document.getElementById('grafica2d-web');
          if (div) {
            const canvas = await (window as any).html2canvas(div);
            graficaUri = canvas.toDataURL('image/png');
            await finalizarPDF();
          }
          return;
        }
      } else {
        graficaUri = await chartRef.current?.capture();
        await finalizarPDF();
      }
    }
  
    else {
      if (Platform.OS === 'web') {
        const esperarGrafica3D = async (timeout = 5000): Promise<string | null> => {
          return new Promise((resolve) => {
            const inicio = Date.now();
            const revisar = () => {
              if (grafica3DUri) {
                resolve(grafica3DUri);
              } else if (Date.now() - inicio > timeout) {
                resolve(null);
              } else {
                setTimeout(revisar, 300);
              }
            };
            revisar();
          });
        };
  
        graficaUri = await esperarGrafica3D();
  
        if (!graficaUri) {
          alert('No se pudo obtener la gráfica 3D. Asegúrate de que haya cargado por completo.');
          return;
        }
  
        await finalizarPDF();
      } else {
        if (!grafica3DUri) {
          alert('Aún no se ha generado la imagen de la gráfica 3D. Espera unos segundos.');
          return;
        }
        graficaUri = grafica3DUri;
        await finalizarPDF();
      }
    }
  };  

  const htmlGrafica3D = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0">
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <style>
          html, body { margin: 0; padding: 0; height: 100vh; width: 100vw; }
          #graph { height: 100%; width: 100%; }
        </style>
      </head>
      <body>
        <div id="graph"></div>
        <script>
          const puntos = ${JSON.stringify(puntosEuler)};
          const graphDiv = document.getElementById('graph');

          Plotly.newPlot(graphDiv, [{
            x: puntos.map(p => p.x),
            y: puntos.map(p => p.y),
            z: puntos.map(p => p.z),
            mode: 'lines+markers',
            marker: { size: 4, color: '#6e57e0' },
            line: { width: 2, color: '#6e57e0' },
            type: 'scatter3d'
          }], {
            autosize: true,
            margin: { t:0, b:0, l:0, r:0 },
            scene: {
              xaxis: { color: '#333' },
              yaxis: { color: '#333' },
              zaxis: { color: '#333' }
            }
          }).then(() => {
            setTimeout(() => {
              Plotly.toImage(graphDiv, { format: 'png', width: 800, height: 600 }).then(function(dataUrl) {
                // Detecta el entorno y envía el mensaje
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(dataUrl);
                } else if (window.parent && window.parent !== window) {
                  window.parent.postMessage({ type: 'grafica3d', dataUrl }, '*');
                } else {
                  console.warn('No se pudo enviar la imagen 3D, entorno no compatible.');
                }
              });
            }, 1000);
          });
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
  
    const recibirMensaje = (event: MessageEvent) => {
      if (event.data?.type === 'grafica3d' && event.data?.dataUrl?.startsWith('data:image')) {
        setGrafica3DUri(event.data.dataUrl);
      }
    };
  
    window.addEventListener('message', recibirMensaje);
    return () => window.removeEventListener('message', recibirMensaje);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={gradients[index]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <Text style={styles.titulo}>Euler Mejorado</Text>

            {[{ label: 'f(x, y)', value: funcion, set: setFuncion },
            { label: 'x0', value: x0, set: setX0 },
            { label: 'y0', value: y0, set: setY0 },
            { label: 'h (paso)', value: h, set: setH },
            { label: 'x final', value: xFinal, set: setXFinal },
            ].map((item, i) => (
              <TextInput
                key={i}
                style={styles.input}
                placeholder={item.label}
                value={item.value}
                onChangeText={item.set}
                keyboardType={item.label === 'f(x, y)' ? 'default' : 'numeric'}
              />
            ))}

            <TouchableOpacity style={styles.button} onPress={calcular}>
              <Text style={styles.buttonText}>{loading ? 'Calculando...' : 'Calcular'}</Text>
            </TouchableOpacity>

            {resultados.length > 0 && (
              <>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#2ecc71' }]}
                  onPress={crearPDF}
                >
                  <Text style={styles.buttonText}>Exportar PDF</Text>
                </TouchableOpacity>
                <Text style={styles.subTitle}>Resultados:</Text>

                <View style={styles.tableContainer}>
                  <ScrollView horizontal style={{ width: '100%' }}>
                    <View>
                      <View style={styles.tableHeader}>
                        {['N', 'Xₙ', 'Yₙ', 'Yₙ₊₁*', 'Xₙ₊₁', 'Yₙ₊₁'].map((h, i) => (
                          <Text key={i} style={styles.tableHeaderText}>{h}</Text>
                        ))}
                      </View>
                      {resultados.slice(0, resultados.length - 1).map((p, i) => {
                        const xn = p.x;
                        const yn = p.y;

                        let fxy = 0;
                        let fNext = 0;
                        let yPred = 0;
                        let yn1 = 0;
                        let xn1 = xn + parseFloat(h);

                        if (funcionValida) {
                          try {
                            fxy = funcionValida(xn, yn);
                            yPred = yn + parseFloat(h) * fxy;
                            fNext = funcionValida(xn + parseFloat(h), yPred);
                            yn1 = yn + (parseFloat(h) / 2) * (fxy + fNext);
                          } catch (e) {
                            console.warn(`Error al evaluar función en fila ${i}:`, e);
                          }
                        }

                        return (
                          <View key={i} style={styles.whiteRow}>
                            <Text style={styles.whiteCell}>{i}</Text>
                            <Text style={styles.whiteCell}>{xn.toFixed(4)}</Text>
                            <Text style={styles.whiteCell}>{yn.toFixed(6)}</Text>
                            <Text style={styles.whiteCell}>{yPred.toFixed(6)}</Text>
                            <Text style={styles.whiteCell}>{xn1.toFixed(4)}</Text>
                            <Text style={styles.whiteCell}>{yn1.toFixed(6)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[styles.tabButton, !verGrafica3D && styles.activeTab]}
                    onPress={() => setVerGrafica3D(false)}
                  >
                    <Text style={[styles.tabText, !verGrafica3D && styles.activeTabText]}>
                      Gráfica 2D
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabButton, verGrafica3D && styles.activeTab]}
                    onPress={() => setVerGrafica3D(true)}
                  >
                    <Text style={[styles.tabText, verGrafica3D && styles.activeTabText]}>
                      Gráfica 3D
                    </Text>
                  </TouchableOpacity>
                </View>

                {!verGrafica3D ? (
                  <Grafica2D
                    ref={chartRef}
                    puntos={puntosEuler}
                  />
                ) : (
                  Platform.OS === 'web' ? (
                    <iframe
                      srcDoc={htmlGrafica3D}
                      style={{ width: '100%', height: 400, border: 'none' }}
                    />
                  ) : (
                    <View style={{ height: 400, width: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}>
                      <WebView
                        originWhitelist={['*']}
                        source={{ html: htmlGrafica3D }}
                        onMessage={(event) => {
                          const dataUrl = event.nativeEvent.data;
                          if (dataUrl.startsWith('data:image')) {
                            setGrafica3DUri(dataUrl);
                          }
                        }}
                        style={{ flex: 1 }}
                      />
                    </View>
                  )
                )}
              </>

            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    alignItems: 'center',
    paddingVertical: 70,
  },
  container: {
    backgroundColor: '#ffffffdd',
    padding: 20,
    borderRadius: 15,
    width: '85%',
    maxWidth: 720,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#6e57e0',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    padding: 14,
    marginVertical: 10,
    fontSize: 16,
    borderColor: '#6e57e0',
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: '#f8f9fd',
  },
  button: {
    backgroundColor: '#6e57e0',
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: 16,
  },
  subTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  resultsScroll: {
    marginTop: 10,
    maxHeight: 250,
  },
  resultCard: {
    backgroundColor: '#ffffffcc',
    padding: 12,
    marginBottom: 6,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#6e57e0',
  },
  step: {
    fontWeight: 'bold',
    color: '#6e57e0',
  },
  tableContainer: {
    marginTop: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#6e57e0',
  },
  tableHeaderText: {
    minWidth: 113.1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
  },
  whiteRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  whiteCell: {
    minWidth: 113.1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    color: '#000000',
    fontSize: 13,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#8e44ad',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTab: {
    backgroundColor: '#6e57e0',
    borderBottomWidth: 3,
    borderColor: '#b084f7',
  },
  inactiveTab: {
    backgroundColor: '#2c235a',
    borderColor: '#6e57e0',
  },
  activeTabText: {
    color: '#e0cfff',
  },
  inactiveTabText: {
    color: '#a9a3c5',
  },
});
