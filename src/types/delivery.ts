export type DeliveryStatus = 
  | 'pending'
  | 'confirmed'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Delivery {
  id: string;
  trackingNumber: string;
  status: DeliveryStatus;
  createdAt: number;
  updatedAt: number;
  estimatedDelivery?: number;
  currentLocation?: string;
  recipient?: string;
  address?: string;
  rating?: number; // 1-5 stars
  review?: string; // User review text
}

export interface DeliveryHistoryItem {
  deliveryId: string;
  status: DeliveryStatus;
  timestamp: number;
  message: string;
  location?: string;
}




