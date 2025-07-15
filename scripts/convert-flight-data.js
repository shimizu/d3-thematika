import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSVファイルを読み込んでパースする関数
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim() || '';
    });
    return obj;
  });
}

// 空港データを読み込み
function loadAirports() {
  const airportsPath = path.join(__dirname, '../reference/airports.csv');
  const airports = parseCSV(airportsPath);
  
  // iataコードをキーとしたマップを作成
  const airportMap = {};
  airports.forEach(airport => {
    if (airport.iata && airport.latitude && airport.longitude) {
      airportMap[airport.iata] = {
        name: airport.name,
        city: airport.city,
        state: airport.state,
        country: airport.country,
        latitude: parseFloat(airport.latitude),
        longitude: parseFloat(airport.longitude)
      };
    }
  });
  
  return airportMap;
}

// フライトデータを読み込み
function loadFlights() {
  const flightsPath = path.join(__dirname, '../reference/flights.csv');
  return parseCSV(flightsPath);
}

// GeoJSONのLineStringフィーチャーを作成
function createLineStringFeature(origin, destination, count, airportMap) {
  const originAirport = airportMap[origin];
  const destinationAirport = airportMap[destination];
  
  if (!originAirport || !destinationAirport) {
    return null;
  }
  
  return {
    type: 'Feature',
    properties: {
      origin: origin,
      destination: destination,
      count: parseInt(count, 10),
      originName: originAirport.name,
      destinationName: destinationAirport.name,
      route: `${origin} → ${destination}`
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [originAirport.longitude, originAirport.latitude],
        [destinationAirport.longitude, destinationAirport.latitude]
      ]
    }
  };
}

// メイン処理
function convertFlightDataToGeoJSON() {
  console.log('🛫 航空路線データの変換を開始...');
  
  // データを読み込み
  const airportMap = loadAirports();
  const flights = loadFlights();
  
  console.log(`✈️ 空港データ: ${Object.keys(airportMap).length}件`);
  console.log(`🛬 フライトデータ: ${flights.length}件`);
  
  // GeoJSONフィーチャーを作成
  const features = [];
  let validFlights = 0;
  let invalidFlights = 0;
  
  flights.forEach(flight => {
    const count = parseInt(flight.count, 10);
    
    // フライト数が100以上の路線のみ抽出
    if (count >= 100) {
      const feature = createLineStringFeature(
        flight.origin,
        flight.destination,
        flight.count,
        airportMap
      );
      
      if (feature) {
        features.push(feature);
        validFlights++;
      } else {
        invalidFlights++;
      }
    }
  });
  
  // フライト数で降順ソート
  features.sort((a, b) => b.properties.count - a.properties.count);
  
  // 上位300路線のみ抽出（可視化に適した数）
  const limitedFeatures = features.slice(0, 300);
  
  // GeoJSONオブジェクトを作成
  const geoJson = {
    type: 'FeatureCollection',
    name: 'flight-routes',
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
      }
    },
    features: limitedFeatures
  };
  
  // 出力パスを設定
  const outputPath = path.join(__dirname, '../examples/geojson/line/line-edgebunding-data.geojson');
  
  // ファイルに書き込み
  fs.writeFileSync(outputPath, JSON.stringify(geoJson, null, 2), 'utf8');
  
  console.log(`📊 変換完了:`);
  console.log(`   - 有効な路線: ${validFlights}件`);
  console.log(`   - 無効な路線: ${invalidFlights}件`);
  console.log(`   - 出力路線: ${limitedFeatures.length}件`);
  console.log(`   - 出力ファイル: ${outputPath}`);
  
  // 統計情報を表示
  if (limitedFeatures.length > 0) {
    const maxCount = limitedFeatures[0].properties.count;
    const minCount = limitedFeatures[limitedFeatures.length - 1].properties.count;
    console.log(`   - フライト数範囲: ${minCount} - ${maxCount}`);
    console.log(`   - 最多路線: ${limitedFeatures[0].properties.route} (${maxCount}便)`);
  }
}

// スクリプトを実行
convertFlightDataToGeoJSON();