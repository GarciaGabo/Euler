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
import { useState } from 'react';
import { evaluate } from 'mathjs';
import { LineChart } from 'react-native-chart-kit';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

function eulerMejorado(
  f: (x: number, y: number) => number,
  x0: number,
  y0: number,
  h: number,
  xFinal: number
) {
  const results = [{ x: x0, y: y0 }];
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
  const [funcion, setFuncion] = useState('2 * x * y');
  const [x0, setX0] = useState('1');
  const [y0, setY0] = useState('1');
  const [h, setH] = useState('0.1');
  const [xFinal, setXFinal] = useState('1.5');
  const [resultados, setResultados] = useState<{ x: number; y: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const { width, height } = useWindowDimensions();

  const calcular = () => {
    try {
      const x0Num = parseFloat(x0);
      const y0Num = parseFloat(y0);
      const hNum = parseFloat(h);
      const xFinalNum = parseFloat(xFinal);

      if (
        !funcion ||
        isNaN(x0Num) ||
        isNaN(y0Num) ||
        isNaN(hNum) ||
        isNaN(xFinalNum)
      ) {
        alert('Por favor, ingresa valores válidos en todos los campos.');
        return;
      }

      if (hNum <= 0 || xFinalNum <= x0Num || hNum > (xFinalNum - x0Num)) {
        alert('h debe ser mayor que 0 y menor o igual a la distancia entre x0 y x final.');
        return;
      }

      const steps = Math.ceil((xFinalNum - x0Num) / hNum);
      if (steps > 1000) {
        alert('Demasiados pasos calculados. Ajusta h o xFinal para que el cálculo sea más eficiente.');
        return;
      }

      const f = (x: number, y: number) => {
        const result = evaluate(funcion, { x, y });
        if (typeof result !== 'number' || isNaN(result)) {
          throw new Error('Resultado inválido');
        }
        return result;
      };

      const res = eulerMejorado(f, x0Num, y0Num, hNum, xFinalNum);

      const yInvalido = res.some(p => !isFinite(p.y) || Math.abs(p.y) > 1e6);
      if (yInvalido) {
        alert('La función produce valores muy grandes o infinitos. Prueba con un xFinal más pequeño o un paso h más chico.');
        return;
      }

      setResultados(res);
    } catch (error) {
      console.error('Error al evaluar la función:', error);
      alert('Hubo un error al evaluar la función. Verifica la sintaxis.');
    }
  };

  return (
    <View style={styles.gradientBackground}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={[styles.container, { width: width * 0.85 }]}>
            <Text style={styles.title}>Euler Mejorado</Text>

            <TextInput
              style={styles.input}
              placeholder="f(x, y), ej: x^2 + y^2"
              value={funcion}
              onChangeText={setFuncion}
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              placeholder="x0"
              value={x0}
              onChangeText={setX0}
              keyboardType="numeric"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              placeholder="y0"
              value={y0}
              onChangeText={setY0}
              keyboardType="numeric"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              placeholder="h (paso)"
              value={h}
              onChangeText={setH}
              keyboardType="numeric"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              placeholder="x final"
              value={xFinal}
              onChangeText={setXFinal}
              keyboardType="numeric"
              placeholderTextColor="#666"
            />

            <Animated.View entering={FadeInDown.duration(500).delay(200)}>
              <TouchableOpacity style={styles.button} onPress={calcular} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Calculando...' : 'Calcular'}</Text>
              </TouchableOpacity>
            </Animated.View>

            {resultados.length > 0 && (
              <Animated.View entering={FadeInDown.duration(600)} style={{ width: '100%' }}>
                <Text style={styles.subTitle}>Resultados:</Text>
                <Text style={{ fontStyle: 'italic', marginTop: 5, color: '#555' }}>
                  f(x, y) = {funcion}
                </Text>

                <Animated.View entering={FadeIn.duration(800)} style={styles.resultBox}>
                  <ScrollView style={{ maxHeight: 350 }}>
                    {resultados.map((p, i) => (
                      <Text
                        key={i}
                        style={[
                          styles.resultText,
                          i === resultados.length - 1
                            ? { fontWeight: 'bold', color: '#6e57e0' }
                            : {},
                        ]}
                      >
                        Paso {i}: x = {p.x.toFixed(2)}, y = {p.y.toFixed(5)}
                      </Text>
                    ))}
                  </ScrollView>
                </Animated.View>

                <ScrollView
                  horizontal
                  style={{ marginTop: 20 }}
                  contentContainerStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: 12,
                  }}
                >
                  <Animated.View
                    entering={FadeInDown.delay(200).duration(600)}
                    style={{ borderRadius: 12, backgroundColor: '#ffffff' }}
                  >
                    <LineChart
                      data={{
                        labels: resultados.map((p) => p.x.toFixed(2)),
                        datasets: [{ data: resultados.map((p) => p.y) }],
                      }}
                      width={Math.max(resultados.length * 100, width - 40)}
                      height={Math.max(resultados.length * 30, height * 0.5)}
                      yLabelsOffset={10}
                      fromZero
                      chartConfig={{
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        decimalPlaces: 2,
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        propsForDots: {
                          r: '3',
                          strokeWidth: '1',
                          stroke: '#000000',
                          fill: '#000000',
                        },
                        propsForBackgroundLines: {
                          stroke: '#999999',
                        },
                        propsForLabels: {
                          fontSize: 10,
                        },
                      }}
                      bezier
                      style={{
                        paddingLeft: 20,
                        borderRadius: 12,
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </Animated.View>
                </ScrollView>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    backgroundColor: '#6e57e0',
    paddingVertical: 35,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  container: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 30,
    borderRadius: 15,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#6e57e0',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f8f9fd',
    padding: 14,
    marginVertical: 8,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#6e57e0',
  },
  button: {
    marginTop: 15,
    backgroundColor: '#8a67f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  subTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resultBox: {
    backgroundColor: '#f0f0f0',
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    maxHeight: 180,
  },
  resultText: {
    fontSize: 15,
    marginBottom: 6,
    color: '#444',
  },
});
