"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import {
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  Search,
  MapPin,
  AlertTriangle,
  Info,
  Undo,
  Star,
} from "lucide-react"

// Type definitions
interface WeatherData {
  name: string
  main: {
    temp: number
    feels_like: number
    temp_max: number
    temp_min: number
    humidity: number
  }
  wind: {
    speed: number
  }
  weather: Array<{
    main: string
  }>
  rain?: {
    "1h": number
  }
  snow?: {
    "1h": number
  }
}

interface ForecastData {
  dt: number
  main: {
    temp: number
  }
}

interface ChartData {
  date: string
  temp: number
}

export default function Home() {
  // State management
  const [location, setLocation] = useState("")
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [forecast, setForecast] = useState<ForecastData[]>([])
  const [units, setUnits] = useState("metric")
  const [theme, setTheme] = useState("light")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentLocations, setRecentLocations] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [showFeatureInfo, setShowFeatureInfo] = useState(true)
  const [lastAction, setLastAction] = useState<{ type: string; value: string } | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // API configuration
  const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
  const API_BASE = "https://api.openweathermap.org/data/2.5"

  // Theme handling
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  // Load saved preferences from localStorage
  useEffect(() => {
    try {
      const savedUnits = localStorage.getItem("weatherUnits")
      const savedTheme = localStorage.getItem("weatherTheme")
      const savedFavorites = JSON.parse(localStorage.getItem("weatherFavorites") || "[]")
      const savedLocations = JSON.parse(localStorage.getItem("recentLocations") || "[]")
      const hasSeenFeatureInfo = localStorage.getItem("hasSeenFeatureInfo")

      if (savedUnits) setUnits(savedUnits)
      if (savedTheme) setTheme(savedTheme)
      if (savedFavorites) setFavorites(savedFavorites)
      if (savedLocations) setRecentLocations(savedLocations)
      if (hasSeenFeatureInfo) setShowFeatureInfo(false)
    } catch (err) {
      console.error("Error loading from localStorage:", err)
    }
  }, [])

  // Save preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("weatherUnits", units)
      localStorage.setItem("weatherTheme", theme)
      localStorage.setItem("weatherFavorites", JSON.stringify(favorites))
      localStorage.setItem("recentLocations", JSON.stringify(recentLocations))
    } catch (err) {
      console.error("Error saving to localStorage:", err)
    }
  }, [units, theme, favorites, recentLocations])

  const Alert: React.FC<{
    children: React.ReactNode
    variant?: "default" | "destructive"
    className?: string
  }> = ({ children, variant = "default", className = "" }) => {
    const baseStyles = "p-4 rounded-lg flex items-start gap-2"
    const variantStyles = {
      default: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
      destructive: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
    }

    return <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>{children}</div>
  }

  const AlertDescription: React.FC<{
    children: React.ReactNode
    className?: string
  }> = ({ children, className = "" }) => {
    return <div className={`text-sm flex-1 ${className}`}>{children}</div>
  }

  const fetchWeather = async (searchLocation: string) => {
    if (!API_KEY) {
      setError("Weather data is temporarily unavailable. Please check back later.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const weatherResponse = await fetch(`${API_BASE}/weather?q=${searchLocation}&units=${units}&appid=${API_KEY}`)

      if (!weatherResponse.ok) {
        throw new Error("Location not found. Please check the spelling and try again.")
      }

      const weatherData: WeatherData = await weatherResponse.json()

      const forecastResponse = await fetch(`${API_BASE}/forecast?q=${searchLocation}&units=${units}&appid=${API_KEY}`)

      if (!forecastResponse.ok) {
        throw new Error("Forecast data unavailable")
      }

      const forecastData = await forecastResponse.json()

      setWeather(weatherData)
      setForecast(forecastData.list)

      // Update recent locations
      if (!recentLocations.includes(searchLocation)) {
        const updatedLocations = [searchLocation, ...recentLocations].slice(0, 5)
        setRecentLocations(updatedLocations)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (location.trim()) {
      fetchWeather(location)
    }
  }

  const toggleFavorite = (loc: string) => {
    try {
      if (favorites.includes(loc)) {
        setFavorites(favorites.filter((f) => f !== loc))
      } else {
        setFavorites([...favorites, loc])
      }
    } catch (err) {
      console.error("Error updating favorites:", err)
    }
  }

  const toggleUnits = () => {
    const oldUnit = units
    setUnits(units === "metric" ? "imperial" : "metric")
    setLastAction({ type: "units", value: oldUnit })
  }

  const undoLastAction = () => {
    if (lastAction?.type === "units") {
      setUnits(lastAction.value)
      setLastAction(null)
    }
  }

  const formatTemp = (temp: number): string => {
    return `${Math.round(temp)}°${units === "metric" ? "C" : "F"}`
  }

  const renderForecastChart = () => {
    if (!forecast.length) return null

    const chartData: ChartData[] = forecast
      .filter((_, index) => index % 8 === 0)
      .map((item) => ({
        date: new Date(item.dt * 1000).toLocaleDateString(),
        temp: item.main.temp,
      }))

    return (
      <div className="h-64 mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis
              label={{
                value: `Temperature (°${units === "metric" ? "C" : "F"})`,
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="temp" stroke="#8884d8" name="Temperature" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const dismissFeatureInfo = () => {
    setShowFeatureInfo(false)
    try {
      localStorage.setItem("hasSeenFeatureInfo", "true")
    } catch (err) {
      console.error("Error saving feature info state:", err)
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Feature Benefits Info - Heuristic #1 */}
        {showFeatureInfo && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Welcome! This dashboard helps you: • Track current weather and forecasts • Save favorite locations for
              quick access • View detailed weather metrics • Customize your experience with °C/°F and dark mode
              <button onClick={dismissFeatureInfo} className="ml-2 text-sm text-blue-500 hover:underline">
                Got it
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weather Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
              title="Switch between light and dark mode for better visibility"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-gray-800 dark:text-white" />
              ) : (
                <Sun className="w-5 h-5 text-gray-800 dark:text-white" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleUnits}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white"
                title="Switch between Celsius and Fahrenheit"
              >
                {units === "metric" ? "°C" : "°F"}
              </button>
              {lastAction && (
                <button
                  onClick={undoLastAction}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600"
                  title="Undo last unit change"
                >
                  <Undo className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter city name (e.g., London, New York, Tokyo)"
                className="w-full p-2 pl-10 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                aria-label="Search location"
              />
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Recent locations */}
        {recentLocations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Recent Searches</h2>
            <div className="flex flex-wrap gap-2">
              {recentLocations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => fetchWeather(loc)}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  {loc}
                  {favorites.includes(loc) && <Star className="w-3 h-3 text-yellow-500" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Weather display */}
        {weather && (
          <div className="space-y-6">
            <div className="p-6 border rounded-lg dark:border-gray-600">
              {/* Basic info always visible */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                    {weather.name}
                    <button
                      onClick={() => toggleFavorite(weather.name)}
                      className="text-yellow-500"
                      title={favorites.includes(weather.name) ? "Remove from favorites" : "Add to favorites"}
                    >
                      {favorites.includes(weather.name) ? "★" : "☆"}
                    </button>
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    {new Date().toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-gray-900 dark:text-white">
                    {formatTemp(weather.main.temp)}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    Feels like {formatTemp(weather.main.feels_like)}
                  </div>
                </div>
              </div>

              {/* Detailed info in collapsible section */}
              <details className="mt-4" open={showDetails}>
                <summary
                  onClick={() => setShowDetails(!showDetails)}
                  className="cursor-pointer text-blue-500 hover:underline"
                >
                  {showDetails ? "Hide" : "Show"} detailed weather information
                </summary>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">High/Low</div>
                      <div className="text-gray-900 dark:text-white">
                        {formatTemp(weather.main.temp_max)} / {formatTemp(weather.main.temp_min)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Humidity</div>
                      <div className="text-gray-900 dark:text-white">{weather.main.humidity}%</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Wind className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Wind</div>
                      <div className="text-gray-900 dark:text-white">
                        {Math.round(weather.wind.speed)} {units === "metric" ? "m/s" : "mph"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Weather</div>
                      <div className="text-gray-900 dark:text-white">{weather.weather[0].main}</div>
                    </div>
                  </div>
                </div>
              </details>

              {/* Additional weather conditions if available */}
              {weather.rain && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-5 h-5 text-blue-500" />
                    <span className="text-blue-700 dark:text-blue-300">Rain in last hour: {weather.rain["1h"]} mm</span>
                  </div>
                </div>
              )}

              {weather.snow && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-5 h-5 text-blue-500" />
                    <span className="text-blue-700 dark:text-blue-300">Snow in last hour: {weather.snow["1h"]} mm</span>
                  </div>
                </div>
              )}
            </div>

            {/* Forecast chart with heading */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">5-Day Forecast</h3>
              {renderForecastChart()}
            </div>
          </div>
        )}

        {/* Favorites section */}
        {favorites.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Favorite Locations</h2>
            <div className="flex flex-wrap gap-2">
              {favorites.map((loc) => (
                <button
                  key={loc}
                  onClick={() => fetchWeather(loc)}
                  className="px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-gray-800 dark:text-yellow-100 flex items-center gap-2 transition-colors"
                >
                  <Star className="w-4 h-4 fill-yellow-400" />
                  {loc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer with attribution */}
        <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Weather data provided by OpenWeather API</p>
          {error && error.includes("API key") && (
            <p className="mt-1">
              <span className="text-red-500">Please configure your API key to access weather data</span>
            </p>
          )}
        </footer>
      </div>
    </main>
  )
}

