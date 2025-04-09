import React, { forwardRef } from 'react';
import { Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import ViewShot from 'react-native-view-shot';

type Punto = { x: number; y: number };

interface Grafica2DProps {
  puntos: Punto[];
}

const ChartContent = ({ puntos, chartWidth, chartHeight }: {
  puntos: Punto[],
  chartWidth: number,
  chartHeight: number
}) => (
  <LineChart
    data={{
      labels: puntos.map((p, i) => (i % 2 === 0 ? p.x.toFixed(2) : '')),
      datasets: [{ data: puntos.map((p) => p.y) }],
    }}
    width={chartWidth}
    height={chartHeight}
    yLabelsOffset={10}
    fromZero
    chartConfig={{
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 2,
      color: (opacity = 1) => `rgba(110, 87, 224, ${opacity})`,
      labelColor: () => '#333',
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: '#6e57e0',
      },
    }}
    bezier
    style={{ borderRadius: 12, borderWidth: 0 }}
  />
);

const Grafica2D = forwardRef<any, Grafica2DProps>(({ puntos }, ref) => {
  const { width } = useWindowDimensions();
  const chartWidth = width;
  const chartHeight = Math.min(400, Math.max(200, chartWidth * 0.6));

  if (Platform.OS === 'web') {
    return (
      <ScrollView horizontal>
        <View
          id="grafica2d-web"
          style={{ backgroundColor: '#fff', padding: 10, borderRadius: 12 }}
        >
          <ChartContent puntos={puntos} chartWidth={chartWidth} chartHeight={chartHeight} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView horizontal>
      <ViewShot ref={ref} options={{ format: 'png', quality: 1, result: 'data-uri' }}>
        <ChartContent puntos={puntos} chartWidth={chartWidth} chartHeight={chartHeight} />
      </ViewShot>
    </ScrollView>
  );
});

export default Grafica2D;
