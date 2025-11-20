import { useRef, useEffect } from "react";

export default function GeometryCanvas({ shape, labels, dimensions, className }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 280;
    const height = 280;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Set style
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = '#dbeafe';
    ctx.font = 'bold 14px Arial';

    const centerX = width / 2;
    const centerY = height / 2;

    switch (shape) {
      case 'triangle':
        drawTriangle(ctx, centerX, centerY, dimensions, labels);
        break;
      case 'square':
        drawSquare(ctx, centerX, centerY, dimensions, labels);
        break;
      case 'rectangle':
        drawRectangle(ctx, centerX, centerY, dimensions, labels);
        break;
      case 'circle':
        drawCircle(ctx, centerX, centerY, dimensions, labels);
        break;
      case 'right_triangle':
        drawRightTriangle(ctx, centerX, centerY, dimensions, labels);
        break;
      case 'parallelogram':
        drawParallelogram(ctx, centerX, centerY, dimensions, labels);
        break;
      case 'trapezoid':
        drawTrapezoid(ctx, centerX, centerY, dimensions, labels);
        break;
      default:
        break;
    }
  }, [shape, labels, dimensions]);

  const drawTriangle = (ctx, cx, cy, dims, labels) => {
    const size = 100;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx - size, cy + size);
    ctx.lineTo(cx + size, cy + size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 16px Arial';
    if (labels?.top) {
      ctx.fillText(labels.top, cx - 10, cy - size - 10);
    }
    if (labels?.left) {
      ctx.fillText(labels.left, cx - size - 20, cy + size + 20);
    }
    if (labels?.right) {
      ctx.fillText(labels.right, cx + size + 10, cy + size + 20);
    }

    // Dimensions
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 13px Arial';
    if (dims?.base) {
      ctx.fillText(dims.base, cx - 30, cy + size + 35);
    }
    if (dims?.height) {
      ctx.fillText(dims.height, cx + size/2 + 5, cy + 5);
    }
  };

  const drawSquare = (ctx, cx, cy, dims, labels) => {
    const size = 100;
    ctx.fillRect(cx - size/2, cy - size/2, size, size);
    ctx.strokeRect(cx - size/2, cy - size/2, size, size);

    // Labels
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 16px Arial';
    if (labels?.topLeft) {
      ctx.fillText(labels.topLeft, cx - size/2 - 20, cy - size/2 - 8);
    }
    if (labels?.topRight) {
      ctx.fillText(labels.topRight, cx + size/2 + 8, cy - size/2 - 8);
    }
    if (labels?.bottomLeft) {
      ctx.fillText(labels.bottomLeft, cx - size/2 - 20, cy + size/2 + 18);
    }
    if (labels?.bottomRight) {
      ctx.fillText(labels.bottomRight, cx + size/2 + 8, cy + size/2 + 18);
    }

    // Dimensions
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 13px Arial';
    if (dims?.side) {
      ctx.fillText(dims.side, cx - 20, cy - size/2 - 12);
    }
  };

  const drawRectangle = (ctx, cx, cy, dims, labels) => {
    const width = 140;
    const height = 90;
    ctx.fillRect(cx - width/2, cy - height/2, width, height);
    ctx.strokeRect(cx - width/2, cy - height/2, width, height);

    // Labels
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 16px Arial';
    if (labels?.top) {
      ctx.fillText('D', cx - width/2 - 18, cy - height/2 - 8);
      ctx.fillText('C', cx + width/2 + 8, cy - height/2 - 8);
    }
    if (labels?.bottom) {
      ctx.fillText('A', cx - width/2 - 18, cy + height/2 + 18);
      ctx.fillText('B', cx + width/2 + 8, cy + height/2 + 18);
    }

    // Dimensions
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 13px Arial';
    if (dims?.width) {
      ctx.fillText('אורך: ' + dims.width, cx - 40, cy - height/2 - 15);
    }
    if (dims?.height) {
      ctx.fillText('רוחב: ' + dims.height, cx + width/2 + 10, cy + 5);
    }
  };

  const drawCircle = (ctx, cx, cy, dims, labels) => {
    const radius = 70;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw radius line
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 13px Arial';
    if (dims?.radius) {
      ctx.fillText(`r = ${dims.radius}`, cx + radius/2 - 20, cy - 10);
    }

    // Center dot
    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
    ctx.fill();
  };

  const drawRightTriangle = (ctx, cx, cy, dims, labels) => {
    const width = 120;
    const height = 90;
    
    ctx.beginPath();
    ctx.moveTo(cx - width/2, cy + height/2);
    ctx.lineTo(cx + width/2, cy + height/2);
    ctx.lineTo(cx + width/2, cy - height/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right angle marker
    const markerSize = 15;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + width/2 - markerSize, cy + height/2 - markerSize, markerSize, markerSize);

    // Labels
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 16px Arial';
    if (labels?.top) {
      ctx.fillText(labels.top, cx + width/2 + 10, cy - height/2 - 8);
    }
    if (labels?.left) {
      ctx.fillText(labels.left, cx - width/2 - 20, cy + height/2 + 18);
    }
    if (labels?.right) {
      ctx.fillText(labels.right, cx + width/2 + 10, cy + height/2 + 18);
    }

    // Dimensions
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 13px Arial';
    if (dims?.base) {
      ctx.fillText(dims.base, cx - 15, cy + height/2 + 32);
    }
    if (dims?.height) {
      ctx.fillText(dims.height, cx + width/2 + 20, cy + 5);
    }
    if (dims?.hypotenuse) {
      ctx.fillText(dims.hypotenuse, cx - 20, cy - 15);
    }
  };

  const drawParallelogram = (ctx, cx, cy, dims, labels) => {
    const width = 120;
    const height = 70;
    const offset = 30;

    ctx.beginPath();
    ctx.moveTo(cx - width/2 + offset, cy - height/2);
    ctx.lineTo(cx + width/2 + offset, cy - height/2);
    ctx.lineTo(cx + width/2 - offset, cy + height/2);
    ctx.lineTo(cx - width/2 - offset, cy + height/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 13px Arial';
    if (dims?.base) {
      ctx.fillText(dims.base, cx - 20, cy + height/2 + 28);
    }
    if (dims?.height) {
      // Draw height line
      ctx.strokeStyle = '#dc2626';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + width/2 + offset, cy - height/2);
      ctx.lineTo(cx + width/2 + offset, cy + height/2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(dims.height, cx + width/2 + offset + 20, cy + 5);
    }
  };

  const drawTrapezoid = (ctx, cx, cy, dims, labels) => {
    const topWidth = 80;
    const bottomWidth = 130;
    const height = 80;

    ctx.beginPath();
    ctx.moveTo(cx - topWidth/2, cy - height/2);
    ctx.lineTo(cx + topWidth/2, cy - height/2);
    ctx.lineTo(cx + bottomWidth/2, cy + height/2);
    ctx.lineTo(cx - bottomWidth/2, cy + height/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 13px Arial';
    if (dims?.top) {
      ctx.fillText(dims.top, cx - 20, cy - height/2 - 12);
    }
    if (dims?.bottom) {
      ctx.fillText(dims.bottom, cx - 25, cy + height/2 + 28);
    }
    if (dims?.height) {
      ctx.fillText(dims.height, cx + bottomWidth/2 + 20, cy + 5);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className={`border-2 border-blue-200 rounded-xl bg-slate-50 shadow-md ${className}`}
      style={{ maxWidth: '280px', height: 'auto' }}
    />
  );
}