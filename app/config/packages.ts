export interface WifiPackage {
  id: string;
  name: string;
  price: number;        // In KES
  durationHours: number;
  speedLimit: string;
  dataLimit: string;
  detail: string;
  isOffer: boolean;     // Separates standard packages from special offers
}

export const WIFI_BILLING_CATALOG: Record<string, WifiPackage> = {
  // --- STANDARD PACKAGES ---
  "1hr": {
    id: "1hr",
    name: "1 Hour Standard",
    price: 15,
    durationHours: 1,
    speedLimit: "5Mbps",
    dataLimit: "Unlimited",
    detail: "Standard short-session pass",
    isOffer: false,
  },
  "24hr": {
    id: "24hr",
    name: "24 Hours Day Pass",
    price: 50,
    durationHours: 24,
    speedLimit: "8Mbps",
    dataLimit: "Unlimited",
    detail: "Non-stop access all day",
    isOffer: false,
  },
  "7day": {
    id: "7day",
    name: "7 Days Weekly",
    price: 250,
    durationHours: 168,
    speedLimit: "10Mbps",
    dataLimit: "Unlimited",
    detail: "Perfect for remote work",
    isOffer: false,
  },

  // --- SPECIAL PROMOTIONAL OFFERS ---
  "offer_1hr": {
    id: "offer_1hr",
    name: "⚡ 1 Hour Power Hour",
    price: 10,
    durationHours: 1,
    speedLimit: "15Mbps",
    dataLimit: "Unlimited",
    detail: "Flash Deal: High-speed browsing boost",
    isOffer: true,
  },
  "offer_night": {
    id: "offer_night",
    name: "🌙 Night Owl Special",
    price: 30,
    durationHours: 6,
    speedLimit: "12Mbps",
    dataLimit: "Unlimited",
    detail: "Valid midnight to 6:00 AM",
    isOffer: true,
  },
  "offer_weekend": {
    id: "offer_weekend",
    name: "🎉 Weekend Binge Pass",
    price: 100,
    durationHours: 48,
    speedLimit: "10Mbps",
    dataLimit: "Unlimited",
    detail: "Full Friday night to Sunday night",
    isOffer: true,
  }
};