import html2canvas from 'html2canvas';

/**
 * Capture a visual container by DOM element ID and download it as a high-resolution PNG image.
 * @param {string} elementId - ID of the container element to capture
 * @param {string} fileName - Suggested file download name (e.g. 'churn_dashboard_visuals.png')
 */
export const downloadVisualAsPng = async (elementId, fileName = 'visual_analytics_report.png') => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert(`Could not find container #${elementId} to export.`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution (retina crispness)
      useCORS: true,
      backgroundColor: '#f8fafc',
      logging: false,
      ignoreElements: (node) => {
        // Exclude elements marked with .no-print or interactive buttons from visual capture
        return node.classList && node.classList.contains('no-export');
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imgData;
    link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to export visuals to PNG:', error);
    alert('Failed to export visuals as image: ' + error.message);
  }
};

/**
 * Open native browser print dialog formatted as an executive PDF summary.
 */
export const exportVisualAsPdf = () => {
  window.print();
};
