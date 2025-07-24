import * as d3 from 'd3-selection';

/**
 * ストーリー用のマップコンテナを作成
 */
export function createMapContainer(width: number = 800, height: number = 500): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'story-container';
  
  const mapDiv = document.createElement('div');
  mapDiv.id = 'map';
  mapDiv.style.width = `${width}px`;
  mapDiv.style.height = `${height}px`;
  
  container.appendChild(mapDiv);
  return container;
}

/**
 * サンプルのGeoJSONデータを生成
 */
export function generateSamplePoints(count: number = 10): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  for (let i = 0; i < count; i++) {
    features.push({
      type: 'Feature',
      properties: {
        name: `Point ${i + 1}`,
        value: Math.random() * 100,
        category: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C'
      },
      geometry: {
        type: 'Point',
        coordinates: [
          -180 + Math.random() * 360,
          -90 + Math.random() * 180
        ]
      }
    });
  }
  
  return {
    type: 'FeatureCollection',
    features
  };
}

/**
 * サンプルの世界地図データを読み込む
 */
export async function loadWorldData(): Promise<GeoJSON.FeatureCollection> {
  // Storybookのstatic directoryから読み込む
  try {
    const response = await fetch('./geojson/world.geojson');
    return await response.json();
  } catch (error) {
    console.warn('World data not found, using sample data');
    return generateSamplePolygons();
  }
}

/**
 * サンプルのポリゴンデータを生成
 */
export function generateSamplePolygons(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [
    {
      type: 'Feature',
      properties: { name: 'Sample Region 1', value: 75 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-120, 40], [-100, 40], [-100, 20], [-120, 20], [-120, 40]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Sample Region 2', value: 50 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80, 45], [-60, 45], [-60, 25], [-80, 25], [-80, 45]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Sample Region 3', value: 25 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [10, 50], [30, 50], [30, 30], [10, 30], [10, 50]
        ]]
      }
    }
  ];
  
  return {
    type: 'FeatureCollection',
    features
  };
}

/**
 * サンプルのLineStringデータを生成
 */
export function generateSampleLines(count: number = 5): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  for (let i = 0; i < count; i++) {
    const startLon = -180 + Math.random() * 360;
    const startLat = -60 + Math.random() * 120;
    const points: number[][] = [[startLon, startLat]];
    
    // 3-6個の点を生成
    const pointCount = 3 + Math.floor(Math.random() * 4);
    for (let j = 1; j < pointCount; j++) {
      points.push([
        points[j-1][0] + (Math.random() - 0.5) * 30,
        points[j-1][1] + (Math.random() - 0.5) * 20
      ]);
    }
    
    features.push({
      type: 'Feature',
      properties: {
        name: `Route ${i + 1}`,
        text: `Route ${String.fromCharCode(65 + i)}`, // A, B, C...
        value: Math.random() * 100
      },
      geometry: {
        type: 'LineString',
        coordinates: points
      }
    });
  }
  
  return {
    type: 'FeatureCollection',
    features
  };
}

/**
 * サンプルのMultiLineStringデータを生成
 */
export function generateSampleMultiLines(count: number = 3): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  for (let i = 0; i < count; i++) {
    const lineCount = 2 + Math.floor(Math.random() * 3); // 2-4本の線
    const lines: number[][][] = [];
    
    for (let j = 0; j < lineCount; j++) {
      const startLon = -180 + Math.random() * 360;
      const startLat = -60 + Math.random() * 120;
      const points: number[][] = [[startLon, startLat]];
      
      const pointCount = 3 + Math.floor(Math.random() * 3);
      for (let k = 1; k < pointCount; k++) {
        points.push([
          points[k-1][0] + (Math.random() - 0.5) * 20,
          points[k-1][1] + (Math.random() - 0.5) * 15
        ]);
      }
      
      lines.push(points);
    }
    
    features.push({
      type: 'Feature',
      properties: {
        name: `MultiRoute ${i + 1}`,
        text: `Network ${String.fromCharCode(65 + i)}`,
        value: Math.random() * 100
      },
      geometry: {
        type: 'MultiLineString',
        coordinates: lines
      }
    });
  }
  
  return {
    type: 'FeatureCollection',
    features
  };
}

/**
 * 接続関係を持つLineStringデータを生成（エッジバンドリング用）
 */
export function generateConnectionLines(): GeoJSON.FeatureCollection {
  // ハブとなる都市
  const hubs = [
    { name: 'Tokyo', coord: [139.6917, 35.6895] },
    { name: 'London', coord: [0.1276, 51.5074] },
    { name: 'New York', coord: [-73.935242, 40.730610] },
    { name: 'Singapore', coord: [103.8198, 1.3521] },
    { name: 'Dubai', coord: [55.2708, 25.2048] }
  ];
  
  // 周辺都市
  const cities = [
    { name: 'Osaka', coord: [135.5022, 34.6937] },
    { name: 'Seoul', coord: [126.9780, 37.5665] },
    { name: 'Beijing', coord: [116.4074, 39.9042] },
    { name: 'Paris', coord: [2.3522, 48.8566] },
    { name: 'Berlin', coord: [13.4050, 52.5200] },
    { name: 'Boston', coord: [-71.0589, 42.3601] },
    { name: 'Chicago', coord: [-87.6298, 41.8781] },
    { name: 'Bangkok', coord: [100.5018, 13.7563] },
    { name: 'Mumbai', coord: [72.8777, 19.0760] },
    { name: 'Cairo', coord: [31.2357, 30.0444] }
  ];
  
  const features: GeoJSON.Feature[] = [];
  
  // ハブから複数の都市への接続を生成
  hubs.forEach((hub, hubIndex) => {
    // 各ハブから3-5都市に接続
    const connectionCount = 3 + Math.floor(Math.random() * 3);
    const shuffled = [...cities].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < connectionCount; i++) {
      const city = shuffled[i];
      features.push({
        type: 'Feature',
        properties: {
          from: hub.name,
          to: city.name,
          flow: Math.random() * 100,
          hubIndex: hubIndex
        },
        geometry: {
          type: 'LineString',
          coordinates: [hub.coord, city.coord]
        }
      });
    }
  });
  
  // ハブ間の接続も追加
  for (let i = 0; i < hubs.length - 1; i++) {
    for (let j = i + 1; j < hubs.length; j++) {
      if (Math.random() > 0.5) { // 50%の確率で接続
        features.push({
          type: 'Feature',
          properties: {
            from: hubs[i].name,
            to: hubs[j].name,
            flow: Math.random() * 200,
            isHubConnection: true
          },
          geometry: {
            type: 'LineString',
            coordinates: [hubs[i].coord, hubs[j].coord]
          }
        });
      }
    }
  }
  
  return {
    type: 'FeatureCollection',
    features
  };
}