import os
import random
import asyncio
from datetime import datetime, timedelta
import httpx
from fastapi import HTTPException

WAQI_BASE = "https://api.waqi.info"
WAQI_TOKEN = os.getenv("WAQI_API_TOKEN", "demo")

INDIAN_CITIES = [
    {'city': 'Delhi', 'lat': 28.6139, 'lng': 77.2090, 'country': 'IN'},
    {'city': 'Mumbai', 'lat': 19.0760, 'lng': 72.8777, 'country': 'IN'},
    {'city': 'Bangalore', 'lat': 12.9716, 'lng': 77.5946, 'country': 'IN'},
    {'city': 'Chennai', 'lat': 13.0827, 'lng': 80.2707, 'country': 'IN'},
    {'city': 'Kolkata', 'lat': 22.5726, 'lng': 88.3639, 'country': 'IN'},
    {'city': 'Hyderabad', 'lat': 17.3850, 'lng': 78.4867, 'country': 'IN'},
    {'city': 'Pune', 'lat': 18.5204, 'lng': 73.8567, 'country': 'IN'},
    {'city': 'Ahmedabad', 'lat': 23.0225, 'lng': 72.5714, 'country': 'IN'},
    {'city': 'Jaipur', 'lat': 26.9124, 'lng': 75.7873, 'country': 'IN'},
    {'city': 'Lucknow', 'lat': 26.8467, 'lng': 80.9462, 'country': 'IN'},
    {'city': 'Kanpur', 'lat': 26.4499, 'lng': 80.3319, 'country': 'IN'},
    {'city': 'Varanasi', 'lat': 25.3176, 'lng': 82.9739, 'country': 'IN'},
    {'city': 'Patna', 'lat': 25.6093, 'lng': 85.1376, 'country': 'IN'},
    {'city': 'Guwahati', 'lat': 26.1445, 'lng': 91.7362, 'country': 'IN'},
]

def generate_demo_aqi(city_data: dict) -> dict:
    base_aqi = {
        'Delhi': 220, 'Kanpur': 200, 'Varanasi': 180, 'Patna': 170,
        'Lucknow': 165, 'Kolkata': 140, 'Mumbai': 120, 'Ahmedabad': 130,
        'Jaipur': 150, 'Pune': 90, 'Hyderabad': 100, 'Chennai': 85,
        'Bangalore': 75, 'Guwahati': 95
    }
    city_name = city_data['city']
    base = base_aqi.get(city_name, 100)
    variation = random.randint(-20, 20)
    aqi = max(10, base + variation)
    return {
        'city': city_name,
        'country': city_data['country'],
        'aqi_value': aqi,
        'pm25': round(aqi * 0.4 + random.random() * 20, 1),
        'pm10': round(aqi * 0.6 + random.random() * 30, 1),
        'no2': round(random.random() * 60 + 10, 1),
        'so2': round(random.random() * 30 + 5, 1),
        'co': round(random.random() * 2 + 0.3, 2),
        'o3': round(random.random() * 80 + 20, 1),
        'latitude': city_data['lat'],
        'longitude': city_data['lng'],
        'source': 'demo',
        'fetched_at': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    }

def get_aqi_category(aqi: int) -> dict:
    if aqi <= 50:
        return {'category': 'Good', 'color': '#00e400', 'emoji': '😊', 'advice': 'Air quality is satisfactory. Enjoy outdoor activities!'}
    if aqi <= 100:
        return {'category': 'Moderate', 'color': '#ffff00', 'emoji': '🙂', 'advice': 'Air quality is acceptable. Unusually sensitive people should limit outdoor exertion.'}
    if aqi <= 150:
        return {'category': 'Unhealthy for Sensitive Groups', 'color': '#ff7e00', 'emoji': '😷', 'advice': 'Members of sensitive groups may experience health effects.'}
    if aqi <= 200:
        return {'category': 'Unhealthy', 'color': '#ff0000', 'emoji': '😨', 'advice': 'Everyone may begin to experience health effects.'}
    if aqi <= 300:
        return {'category': 'Very Unhealthy', 'color': '#8f3f97', 'emoji': '🤮', 'advice': 'Health alert: everyone may experience more serious effects.'}
    return {'category': 'Hazardous', 'color': '#7e0023', 'emoji': '☠️', 'advice': 'Health warnings of emergency conditions. The entire population is likely to be affected.'}

def parse_waqi_response(data: dict, city_name: str) -> dict:
    iaqi = data.get("iaqi", {})
    city_info = data.get("city", {})
    geo = city_info.get("geo", [None, None])
    
    return {
        'city': city_info.get("name", city_name),
        'country': 'IN',
        'aqi_value': data.get("aqi", 0),
        'pm25': iaqi.get("pm25", {}).get("v", None),
        'pm10': iaqi.get("pm10", {}).get("v", None),
        'no2': iaqi.get("no2", {}).get("v", None),
        'so2': iaqi.get("so2", {}).get("v", None),
        'co': iaqi.get("co", {}).get("v", None),
        'o3': iaqi.get("o3", {}).get("v", None),
        'temperature': iaqi.get("t", {}).get("v", None),
        'humidity': iaqi.get("h", {}).get("v", None),
        'wind': iaqi.get("w", {}).get("v", None),
        'latitude': geo[0] if len(geo) > 0 else None,
        'longitude': geo[1] if len(geo) > 1 else None,
        'station': city_info.get("name", None),
        'source': 'waqi',
        'fetched_at': data.get("time", {}).get("iso", datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ'))
    }

async def fetch_city_aqi_from_waqi(client: httpx.AsyncClient, city_name: str) -> dict:
    url = f"{WAQI_BASE}/feed/{city_name}/?token={WAQI_TOKEN}"
    try:
        response = await client.get(url, timeout=5.0)
        res_data = response.json()
        if res_data.get("status") == "ok":
            return parse_waqi_response(res_data.get("data"), city_name)
    except Exception:
        pass
    return None

async def fetch_geo_aqi_from_waqi(client: httpx.AsyncClient, lat: float, lng: float) -> dict:
    url = f"{WAQI_BASE}/feed/geo:{lat};{lng}/?token={WAQI_TOKEN}"
    try:
        response = await client.get(url, timeout=5.0)
        res_data = response.json()
        if res_data.get("status") == "ok":
            return parse_waqi_response(res_data.get("data"), "Unknown")
    except Exception:
        pass
    return None

async def get_cities_aqi():
    aqi_data = []
    
    try:
        async with httpx.AsyncClient() as client:
            tasks = [fetch_city_aqi_from_waqi(client, city['city']) for city in INDIAN_CITIES]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if r and not isinstance(r, Exception):
                    aqi_data.append(r)
    except Exception as e:
        print(f"WAQI API feed error, using demo data: {e}")
        
    if not aqi_data:
        aqi_data = [generate_demo_aqi(city) for city in INDIAN_CITIES]
        
    enriched = []
    for entry in aqi_data:
        cat_info = get_aqi_category(entry['aqi_value'])
        enriched.append({**entry, **cat_info})
        
    return {
        "success": True,
        "data": enriched,
        "source": aqi_data[0].get("source") if aqi_data else "demo",
        "fetched_at": datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    }

async def get_city_aqi(city_name: str):
    try:
        async with httpx.AsyncClient() as client:
            data = await fetch_city_aqi_from_waqi(client, city_name)
            if data:
                return {
                    "success": True,
                    "data": {**data, **get_aqi_category(data['aqi_value'])}
                }
    except Exception as e:
        print(f"WAQI API city error, fallback to demo: {e}")
        
    matching_city = next(
        (c for c in INDIAN_CITIES if c['city'].lower() == city_name.lower()),
        {'city': city_name, 'lat': 20.5937, 'lng': 78.9629, 'country': 'IN'}
    )
    demo = generate_demo_aqi(matching_city)
    return {
        "success": True,
        "data": {**demo, **get_aqi_category(demo['aqi_value'])}
    }

async def get_location_aqi(latitude: float, longitude: float):
    try:
        async with httpx.AsyncClient() as client:
            data = await fetch_geo_aqi_from_waqi(client, latitude, longitude)
            if data:
                return {
                    "success": True,
                    "data": {**data, **get_aqi_category(data['aqi_value'])}
                }
    except Exception as e:
        print(f"WAQI API geo feed error: {e}")
        
    # Find nearest
    nearest = INDIAN_CITIES[0]
    min_dist = float('inf')
    for city in INDIAN_CITIES:
        dist = (city['lat'] - latitude) ** 2 + (city['lng'] - longitude) ** 2
        if dist < min_dist:
            min_dist = dist
            nearest = city
            
    demo = generate_demo_aqi(nearest)
    return {
        "success": True,
        "data": {**demo, **get_aqi_category(demo['aqi_value']), "note": f"Nearest station: {nearest['city']}"}
    }

async def search_stations(keyword: str):
    try:
        async with httpx.AsyncClient() as client:
            url = f"{WAQI_BASE}/search/?token={WAQI_TOKEN}&keyword={keyword}"
            response = await client.get(url, timeout=5.0)
            res_data = response.json()
            if res_data.get("status") == "ok":
                stations = []
                for s in res_data.get("data", []):
                    aqi_str = s.get("aqi", "-")
                    aqi_val = None
                    try:
                        if aqi_str != "-":
                            aqi_val = int(aqi_str)
                    except ValueError:
                        pass
                    
                    geo = s.get("station", {}).get("geo", [None, None])
                    station_data = {
                        "name": s.get("station", {}).get("name"),
                        "aqi_value": aqi_val,
                        "latitude": geo[0] if len(geo) > 0 else None,
                        "longitude": geo[1] if len(geo) > 1 else None,
                        "time": s.get("time", {}).get("stime")
                    }
                    if aqi_val is not None:
                        station_data.update(get_aqi_category(aqi_val))
                    stations.append(station_data)
                return {"success": True, "data": stations}
    except Exception as e:
        print(f"WAQI Search API error: {e}")
        
    return {"success": True, "data": [], "message": "No stations found or API unavailable"}

async def predict_aqi(city: str = None):
    matching_city = next(
        (c for c in INDIAN_CITIES if c['city'].lower() == (city or 'delhi').lower()),
        INDIAN_CITIES[0]
    )
    
    current_aqi = 150
    try:
        async with httpx.AsyncClient() as client:
            data = await fetch_city_aqi_from_waqi(client, matching_city['city'])
            if data:
                current_aqi = data['aqi_value']
            else:
                current_aqi = generate_demo_aqi(matching_city)['aqi_value']
    except Exception:
        current_aqi = generate_demo_aqi(matching_city)['aqi_value']
        
    import math
    predictions = []
    prev_aqi = current_aqi
    for i in range(1, 8):
        trend = math.sin(i * 0.5) * 15
        noise = random.randint(-10, 10)
        predicted_aqi = max(10, round(prev_aqi + trend + noise))
        pred_date = datetime.utcnow() + timedelta(days=i)
        
        predictions.append({
            "date": pred_date.strftime('%Y-%m-%d'),
            "aqi_value": predicted_aqi,
            **get_aqi_category(predicted_aqi),
            "confidence": round(0.95 - i * 0.05, 2)
        })
        prev_aqi = predicted_aqi
        
    return {
        "success": True,
        "data": {
            "city": matching_city['city'],
            "current_aqi": current_aqi,
            **get_aqi_category(current_aqi),
            "predictions": predictions
        }
    }
