// src/components/RevenueSplitChart.jsx
import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

const RevenueSplitChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!data || !data.splits || data.splits.length === 0) {
      return;
    }

    // Extract data for chart
    const labels = data.splits.map(split => split.recipient);
    const percentages = data.splits.map(split => split.percentage);
    const amounts = data.splits.map(split => split.amount);
  // Generate colors with consistent hues for the same recipients
    const colors = [
      'rgba(0, 82, 255, 0.8)',  // User Treasury (blue)
      'rgba(16, 185, 129, 0.8)', // Protocol (green)
      'rgba(124, 58, 237, 0.8)', // Validators (purple)
      'rgba(245, 158, 11, 0.8)', // Community (amber)
      'rgba(239, 68, 68, 0.8)',  // Extra/other (red)
      'rgba(59, 130, 246, 0.8)'  // Extra/other (light blue)
    ];

    // Create a consistent color map based on recipient names
    const colorMap = {};
    const knownRecipients = [
      'User Treasury', 
      'Protocol', 
      'Validators', 
      'Community'
    ];
    
    // Assign consistent colors to known recipients
    knownRecipients.forEach((recipient, index) => {
      colorMap[recipient] = colors[index];
    });
    
    // Assign colors to the actual recipients in the data
    const dataColors = data.splits.map(split => 
      colorMap[split.recipient] || colors[knownRecipients.length % colors.length]
    );

    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {            label: 'Revenue Split (%)',
            data: percentages,
            backgroundColor: dataColors,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 50
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },          tooltip: {
            enabled: true,
            mode: 'index',
            callbacks: {
              label: function(context) {
                const split = data.splits[context.dataIndex];
                const percentage = context.raw;
                const amount = split.amount.toFixed(2);
                return `${split.recipient}: ${percentage}% (${amount} USDC)`;
              },
              title: function() {
                return 'Revenue Distribution';
              },
              afterLabel: function(context) {
                const split = data.splits[context.dataIndex];
                if (split.recipient === 'User Treasury') {
                  return 'Funds user governance and initiatives';
                } else if (split.recipient === 'Protocol') {
                  return 'Supports platform development and security';
                } else if (split.recipient === 'Validators') {
                  return 'Rewards network security providers';
                } else if (split.recipient === 'Community') {
                  return 'Funds education and ecosystem growth';
                }
                return '';
              }
            },
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#FFFFFF',
            bodyColor: '#FFFFFF',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              stepSize: 10
            },
            suggestedMax: 100
          }
        },        animation: {
          duration: 1500,
          easing: 'easeOutQuart',
          delay: (context) => context.dataIndex * 100
        }
      }
    });

    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (!data || !data.splits || data.splits.length === 0) {
    return (
      <div className="no-data-chart">
        <p>No revenue split data available</p>
      </div>
    );
  }

  return (
    <div className="revenue-chart-container">
      <canvas ref={chartRef} height="300"></canvas>
    </div>
  );
};

export default RevenueSplitChart;
