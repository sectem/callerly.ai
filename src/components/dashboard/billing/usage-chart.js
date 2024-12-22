'use client';

import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { Card } from 'react-bootstrap';
import { format } from 'date-fns';

export default function UsageChart({ transactions }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!transactions?.length) return;

    // Process data for the chart
    const last30Days = [...Array(30)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return format(date, 'yyyy-MM-dd');
    });

    const usageData = last30Days.map(date => {
      const dayUsage = transactions
        .filter(t => 
          t.transaction_type === 'usage' && 
          format(new Date(t.created_at), 'yyyy-MM-dd') === date
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return dayUsage;
    });

    // Create or update chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: last30Days.map(date => format(new Date(date), 'MMM d')),
        datasets: [{
          label: 'Minutes Used',
          data: usageData,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Daily Usage (Last 30 Days)'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Minutes'
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [transactions]);

  return (
    <Card>
      <Card.Body>
        <div style={{ height: '300px' }}>
          <canvas ref={chartRef}></canvas>
        </div>
      </Card.Body>
    </Card>
  );
}
