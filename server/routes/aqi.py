from fastapi import APIRouter, Query
from controllers.aqi_controller import get_cities_aqi, get_city_aqi, get_location_aqi, search_stations, predict_aqi

router = APIRouter(prefix="/aqi")

@router.get("/cities")
async def cities():
    return await get_cities_aqi()

@router.get("/city/{city_name}")
async def city(city_name: str):
    return await get_city_aqi(city_name)

@router.get("/location")
async def location(latitude: float = Query(...), longitude: float = Query(...)):
    return await get_location_aqi(latitude, longitude)

@router.get("/search")
async def search(keyword: str = Query(...)):
    return await search_stations(keyword)

@router.get("/predict")
async def predict(city: str = Query(None)):
    return await predict_aqi(city)
