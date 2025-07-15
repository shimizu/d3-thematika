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
        iata: airport.iata,
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

// 既存のGeoJSONフライトデータを読み込み
function loadFlightGeoJSON() {
  const flightGeoJSONPath = path.join(__dirname, '../examples/geojson/line/line-edgebunding-data.geojson');
  const content = fs.readFileSync(flightGeoJSONPath, 'utf8');
  return JSON.parse(content);
}

// 使用されている空港を抽出してフライト数を集計
function extractUsedAirports() {
  const flightGeoJSON = loadFlightGeoJSON();
  const airportStats = {};
  
  // GeoJSONデータから空港の使用統計を収集
  flightGeoJSON.features.forEach(feature => {
    const { origin, destination, count } = feature.properties;
    
    // Origin空港の統計
    if (!airportStats[origin]) {
      airportStats[origin] = {
        totalFlights: 0,
        outboundFlights: 0,
        inboundFlights: 0,
        routes: new Set()
      };
    }
    airportStats[origin].totalFlights += count;
    airportStats[origin].outboundFlights += count;
    airportStats[origin].routes.add(`${origin}-${destination}`);
    
    // Destination空港の統計
    if (!airportStats[destination]) {
      airportStats[destination] = {
        totalFlights: 0,
        outboundFlights: 0,
        inboundFlights: 0,
        routes: new Set()
      };
    }
    airportStats[destination].totalFlights += count;
    airportStats[destination].inboundFlights += count;
    airportStats[destination].routes.add(`${origin}-${destination}`);
  });
  
  // Set を配列に変換
  Object.keys(airportStats).forEach(iata => {
    airportStats[iata].routes = Array.from(airportStats[iata].routes);
    airportStats[iata].routeCount = airportStats[iata].routes.length;
  });
  
  return airportStats;
}

// 空港ポイントGeoJSONを作成
function createAirportsGeoJSON() {
  console.log('✈️ 空港ポイントデータの作成を開始...');
  
  // データを読み込み
  const airportMap = loadAirports();
  const airportStats = extractUsedAirports();
  
  console.log(`📊 空港データ: ${Object.keys(airportMap).length}件`);
  console.log(`🛫 使用されている空港: ${Object.keys(airportStats).length}件`);
  
  // GeoJSONフィーチャーを作成
  const features = [];
  let validAirports = 0;
  let invalidAirports = 0;
  
  Object.keys(airportStats).forEach(iata => {
    const airport = airportMap[iata];
    const stats = airportStats[iata];
    
    if (airport) {
      features.push({
        type: 'Feature',
        properties: {
          iata: iata,
          name: airport.name,
          city: airport.city,
          state: airport.state,
          country: airport.country,
          totalFlights: stats.totalFlights,
          outboundFlights: stats.outboundFlights,
          inboundFlights: stats.inboundFlights,
          routeCount: stats.routeCount,
          // 表示用の情報
          displayName: `${airport.name} (${iata})`,
          location: airport.state ? `${airport.city}, ${airport.state}` : `${airport.city}, ${airport.country}`
        },
        geometry: {
          type: 'Point',
          coordinates: [airport.longitude, airport.latitude]
        }
      });
      validAirports++;
    } else {
      console.warn(`⚠️ 空港データが見つかりません: ${iata}`);
      invalidAirports++;
    }
  });
  
  // フライト数で降順ソート
  features.sort((a, b) => b.properties.totalFlights - a.properties.totalFlights);
  
  // GeoJSONオブジェクトを作成
  const geoJson = {
    type: 'FeatureCollection',
    name: 'major-airports',
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
      }
    },
    features: features
  };
  
  // 出力ディレクトリを作成（存在しない場合）
  const outputDir = path.join(__dirname, '../examples/geojson/point');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 出力パスを設定
  const outputPath = path.join(outputDir, 'airports.geojson');
  
  // ファイルに書き込み
  fs.writeFileSync(outputPath, JSON.stringify(geoJson, null, 2), 'utf8');
  
  console.log(`📍 空港ポイントデータ作成完了:`);
  console.log(`   - 有効な空港: ${validAirports}件`);
  console.log(`   - 無効な空港: ${invalidAirports}件`);
  console.log(`   - 出力ファイル: ${outputPath}`);
  
  // 統計情報を表示
  if (features.length > 0) {
    const maxFlights = features[0].properties.totalFlights;
    const minFlights = features[features.length - 1].properties.totalFlights;
    const topAirport = features[0];
    
    console.log(`   - フライト数範囲: ${minFlights} - ${maxFlights}`);
    console.log(`   - 最多空港: ${topAirport.properties.displayName} (${maxFlights}便)`);
    console.log(`   - 最多空港の場所: ${topAirport.properties.location}`);
    
    // 上位10空港を表示
    console.log(`\n🏆 上位10空港:`);
    features.slice(0, 10).forEach((feature, index) => {
      const props = feature.properties;
      console.log(`   ${index + 1}. ${props.displayName} - ${props.totalFlights.toLocaleString()}便 (${props.routeCount}路線)`);
    });
  }
  
  return geoJson;
}

// スクリプトを実行
createAirportsGeoJSON();