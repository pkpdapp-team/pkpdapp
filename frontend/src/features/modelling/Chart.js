import React, { useEffect, useState } from "react";
import { ResponsiveLine, ResponsiveLineCanvas } from '@nivo/line'

export default function Chart({datasets, pkModels, pdModels}) {
  let renderChart = true;
  const getChartData = (simulate) => Object.entries(simulate).map(([key, data]) => {
    if (key !== 'myokit.time') {
      return {
        id: key,
        data: data.map((y, i) => ({x: simulate['myokit.time'][i], y: y}))
      }
    }
  }).filter(x => x)
  const chart_data = [
    ...pkModels.map(m => getChartData(m.simulate)).flat(),
    ...pdModels.map(m => getChartData(m.simulate)).flat(),
  ]

  return (
    <div style={{ height: 300, width: '100%' }}>
      {renderChart &&
      <ResponsiveLine
        data={chart_data}
        margin={{ top: 50, right: 160, bottom: 50, left: 60 }}
        enablePoints={false}
        xScale={{ type: 'linear' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto'}}
        axisLeft={{
            legend: 'measurement',
            legendOffset: -40,
            legendPosition: 'middle'
        }}
        axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            format: '.2f',
            legend: 'time',
            legendOffset: 36,
            legendPosition: 'middle'
        }}
        colors={{ scheme: 'category10' }}
        lineWidth={2}
        legends={[
            {
                anchor: 'bottom-right',
                direction: 'column',
                justify: false,
                translateX: 140,
                translateY: 0,
                itemsSpacing: 2,
                itemDirection: 'left-to-right',
                itemWidth: 80,
                itemHeight: 12,
                itemOpacity: 0.75,
                symbolSize: 12,
                symbolShape: 'circle',
                symbolBorderColor: 'rgba(0, 0, 0, .5)',
                effects: [
                    {
                        on: 'hover',
                        style: {
                            itemBackground: 'rgba(0, 0, 0, .03)',
                            itemOpacity: 1
                        }
                    }
                ],
            }
        ]}
        
    />
    }
    </div>
  )
 
}
