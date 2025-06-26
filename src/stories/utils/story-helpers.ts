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