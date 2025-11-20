import GeometryCanvas from "./GeometryCanvas";

export default function SmartGeometryDetector({ question, onDimensionsExtracted }) {
  const detectGeometryFromText = (text) => {
    if (!text) return null;

    const lowerText = text.toLowerCase();

    // 1. זיהוי נקודות קואורדינטות - PRIORITY HIGHEST!
    const pointsPattern = /([A-Z])\s*\(\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)/g;
    const points = [...text.matchAll(pointsPattern)];
    
    if (points.length === 3 && (lowerText.includes('משולש') || lowerText.includes('triangle'))) {
      // חישוב מידות אמיתיות מהנקודות!
      const [p1, p2, p3] = points.map(p => ({
        name: p[1],
        x: parseFloat(p[2]),
        y: parseFloat(p[3])
      }));
      
      // מציאת הבסיס - הקו התחתון (y מינימלי)
      const bottomPoints = [p1, p2, p3].sort((a, b) => a.y - b.y);
      const base = Math.abs(bottomPoints[0].x - bottomPoints[1].x);
      
      // מציאת הגובה - ההפרש ב-y
      const height = Math.abs(bottomPoints[2].y - bottomPoints[0].y);
      
      // בדיקה אם זה משולש ישר זווית
      const isRightAngle = (
        (p1.x === p2.x && p2.y === p3.y) ||
        (p1.x === p3.x && p3.y === p2.y) ||
        (p2.x === p1.x && p1.y === p3.y) ||
        (p2.x === p3.x && p3.y === p1.y) ||
        (p3.x === p1.x && p1.y === p2.y) ||
        (p3.x === p2.x && p2.y === p1.y)
      );
      
      return {
        shape: isRightAngle ? 'right_triangle' : 'triangle',
        dimensions: {
          base: `${base} ס"מ`,
          height: `${height} ס"מ`,
          calculated: true
        },
        labels: {
          top: bottomPoints[2].name,
          left: bottomPoints[0].name,
          right: bottomPoints[1].name
        },
        pointsData: [p1, p2, p3]
      };
    }

    // 2. משולש ישר זווית עם מידות ספציפיות
    if (lowerText.includes('ישר זווית') || lowerText.includes('ישרת זווית') || 
        lowerText.includes('פיתגורס') || lowerText.includes('ניצב') ||
        lowerText.includes('right angle') || lowerText.includes('right triangle')) {
      
      const numbers = text.match(/(\d+\.?\d*)\s*ס["']?מ/ig);
      
      return {
        shape: 'right_triangle',
        dimensions: {
          base: numbers && numbers[0] ? numbers[0] : '10 ס"מ',
          height: numbers && numbers[1] ? numbers[1] : '6 ס"מ',
          hypotenuse: numbers && numbers[2] ? numbers[2] : '?'
        },
        labels: {
          top: 'B',
          left: 'A',
          right: 'C'
        }
      };
    }

    // 3. משולש רגיל - זיהוי מתקדם
    if (lowerText.includes('משולש') || lowerText.includes('triangle')) {
      const basePatterns = [
        /בסיס[וה]?\s+(\d+\.?\d*)\s*ס["']?מ/i,
        /בסיס[וה]?\s+של\s+(\d+\.?\d*)/i,
        /של\s+(\d+\.?\d*)\s*ס["']?מ/i,
        /base\s+של\s+(\d+\.?\d*)/i
      ];
      
      const heightPatterns = [
        /גובה[וה]?\s+(\d+\.?\d*)\s*ס["']?מ/i,
        /גובה[וה]?\s+של\s+(\d+\.?\d*)/i,
        /hoogte?\s+של\s+(\d+\.?\d*)/i,
        /height\s+של\s+(\d+\.?\d*)/i
      ];
      
      let baseMatch = null;
      let heightMatch = null;
      
      for (const pattern of basePatterns) {
        baseMatch = text.match(pattern);
        if (baseMatch) break;
      }
      
      for (const pattern of heightPatterns) {
        heightMatch = text.match(pattern);
        if (heightMatch) break;
      }
      
      if (baseMatch || heightMatch) {
        return {
          shape: 'triangle',
          dimensions: {
            base: baseMatch ? `${baseMatch[1]} ס"מ` : '10 ס"מ',
            height: heightMatch ? `${heightMatch[1]} ס"מ` : '6 ס"מ'
          },
          labels: {
            top: 'A',
            left: 'B',
            right: 'C'
          }
        };
      }
      
      // fallback - אם יש רק מספרים
      const numbers = text.match(/(\d+\.?\d*)\s*ס["']?מ/ig);
      if (numbers && numbers.length >= 2) {
        return {
          shape: 'triangle',
          dimensions: {
            base: numbers[0],
            height: numbers[1]
          },
          labels: {
            top: 'A',
            left: 'B',
            right: 'C'
          }
        };
      }
      
      // fallback אחרון - אם יש רק מילה "משולש" ללא מידות
      return {
        shape: 'triangle',
        dimensions: {
          base: '10 ס"מ',
          height: '8 ס"מ'
        },
        labels: {
          top: 'A',
          left: 'B',
          right: 'C'
        }
      };
    }

    // 4. מלבן - זיהוי מתקדם
    if (lowerText.includes('מלבן') || lowerText.includes('rectangle')) {
      const widthPatterns = [
        /אורכו?\s+(\d+\.?\d*)\s*ס["']?מ/i,
        /אורך\s+של\s+(\d+\.?\d*)/i,
        /length\s+של\s+(\d+\.?\d*)/i,
        /(\d+\.?\d*)\s*ס["']?מ\s+אורך/i
      ];
      
      const heightPatterns = [
        /רוחבו?\s+(\d+\.?\d*)\s*ס["']?מ/i,
        /רוחב\s+של\s+(\d+\.?\d*)/i,
        /width\s+של\s+(\d+\.?\d*)/i,
        /(\d+\.?\d*)\s*ס["']?מ\s+רוחב/i
      ];
      
      let widthMatch = null;
      let heightMatch = null;
      
      for (const pattern of widthPatterns) {
        widthMatch = text.match(pattern);
        if (widthMatch) break;
      }
      
      for (const pattern of heightPatterns) {
        heightMatch = text.match(pattern);
        if (heightMatch) break;
      }
      
      if (widthMatch || heightMatch) {
        return {
          shape: 'rectangle',
          dimensions: {
            width: widthMatch ? `${widthMatch[1]} ס"מ` : '12 ס"מ',
            height: heightMatch ? `${heightMatch[1]} ס"מ` : '8 ס"מ'
          },
          labels: {
            top: 'D',
            bottom: 'A',
            left: 'B',
            right: 'C'
          }
        };
      }
      
      // fallback
      const numbers = text.match(/(\d+\.?\d*)\s*ס["']?מ/ig);
      if (numbers && numbers.length >= 2) {
        return {
          shape: 'rectangle',
          dimensions: {
            width: numbers[0],
            height: numbers[1]
          },
          labels: {
            top: 'D',
            bottom: 'A',
            left: 'B',
            right: 'C'
          }
        };
      }
      
      // fallback אחרון
      return {
        shape: 'rectangle',
        dimensions: {
          width: '12 ס"מ',
          height: '8 ס"מ'
        },
        labels: {
          top: 'D',
          bottom: 'A',
          left: 'B',
          right: 'C'
        }
      };
    }

    // 5. ריבוע - זיהוי מתקדם
    if (lowerText.includes('ריבוע') || lowerText.includes('square')) {
      const sidePatterns = [
        /צלעו?\s+(\d+\.?\d*)\s*ס["']?מ/i,
        /צלע\s+של\s+(\d+\.?\d*)/i,
        /side\s+של\s+(\d+\.?\d*)/i
      ];
      
      let sideMatch = null;
      for (const pattern of sidePatterns) {
        sideMatch = text.match(pattern);
        if (sideMatch) break;
      }
      
      if (sideMatch) {
        return {
          shape: 'square',
          dimensions: {
            side: `${sideMatch[1]} ס"מ`
          },
          labels: {
            topLeft: 'D',
            topRight: 'C',
            bottomLeft: 'A',
            bottomRight: 'B'
          }
        };
      }
      
      // fallback
      const numbers = text.match(/(\d+\.?\d*)\s*ס["']?מ/ig);
      if (numbers && numbers.length >= 1) {
        return {
          shape: 'square',
          dimensions: {
            side: numbers[0]
          },
          labels: {
            topLeft: 'D',
            topRight: 'C',
            bottomLeft: 'A',
            bottomRight: 'B'
          }
        };
      }
      
      // fallback אחרון
      return {
        shape: 'square',
        dimensions: {
          side: '8 ס"מ'
        },
        labels: {
          topLeft: 'D',
          topRight: 'C',
          bottomLeft: 'A',
          bottomRight: 'B'
        }
      };
    }

    // 6. מעגל - זיהוי מתקדם
    if (lowerText.includes('מעגל') || lowerText.includes('circle')) {
      const radiusPatterns = [
        /רדיוסו?\s+(\d+\.?\d*)\s*ס["']?מ/i,
        /רדיוס\s+של\s+(\d+\.?\d*)/i,
        /r\s*=\s*(\d+\.?\d*)/i,
        /radius\s+של\s+(\d+\.?\d*)/i
      ];
      
      let radiusMatch = null;
      for (const pattern of radiusPatterns) {
        radiusMatch = text.match(pattern);
        if (radiusMatch) break;
      }
      
      if (radiusMatch) {
        return {
          shape: 'circle',
          dimensions: {
            radius: `${radiusMatch[1]} ס"מ`
          }
        };
      }
      
      // קוטר
      const diameterMatch = text.match(/קוטרו?\s+(\d+\.?\d*)\s*ס["']?מ/i);
      if (diameterMatch) {
        const radius = parseFloat(diameterMatch[1]) / 2;
        return {
          shape: 'circle',
          dimensions: {
            radius: `${radius} ס"מ`
          }
        };
      }
      
      // fallback
      const numbers = text.match(/(\d+\.?\d*)\s*ס["']?מ/ig);
      if (numbers && numbers.length >= 1) {
        return {
          shape: 'circle',
          dimensions: {
            radius: numbers[0]
          }
        };
      }
      
      // fallback אחרון
      return {
        shape: 'circle',
        dimensions: {
          radius: '5 ס"מ'
        }
      };
    }

    // 7. מקבילית
    if (lowerText.includes('מקבילית') || lowerText.includes('parallelogram')) {
      const numbers = text.match(/(\d+\.?\d*)\s*ס["']?מ/ig);
      
      if (numbers && numbers.length >= 2) {
        return {
          shape: 'parallelogram',
          dimensions: {
            base: numbers[0],
            height: numbers[1]
          }
        };
      }
      
      return {
        shape: 'parallelogram',
        dimensions: {
          base: '12 ס"מ',
          height: '6 ס"מ'
        }
      };
    }

    // 8. טרפז
    if (lowerText.includes('טרפז') || lowerText.includes('trapezoid')) {
      const numbers = text.match(/(\d+\.?\d*)\s*ס["']?מ/ig);
      
      if (numbers && numbers.length >= 3) {
        return {
          shape: 'trapezoid',
          dimensions: {
            top: numbers[0],
            bottom: numbers[1],
            height: numbers[2]
          }
        };
      }
      
      return {
        shape: 'trapezoid',
        dimensions: {
          top: '6 ס"מ',
          bottom: '12 ס"מ',
          height: '8 ס"מ'
        }
      };
    }

    return null;
  };

  const geometryData = detectGeometryFromText(question.question_text);
  const hasGeometryMetadata = question.geometry_shape || question.visualization_type === 'geometry';
  const hasDetectedGeometry = geometryData !== null;

  if (!hasGeometryMetadata && !hasDetectedGeometry) {
    return null;
  }

  const shape = question.geometry_shape || geometryData?.shape;
  const dimensions = question.geometry_dimensions || geometryData?.dimensions;
  const labels = question.geometry_labels || geometryData?.labels;

  if (onDimensionsExtracted && geometryData) {
    onDimensionsExtracted(geometryData);
  }

  return (
    <div className="mb-6 flex justify-center">
      <GeometryCanvas
        shape={shape}
        labels={labels}
        dimensions={dimensions}
        className="max-w-[280px]"
      />
    </div>
  );
}