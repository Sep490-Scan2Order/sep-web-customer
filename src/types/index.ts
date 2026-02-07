/**
 * Restaurant interface for S2O (Scan2Order) platform
 */
export interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
  cuisineType: string;
  distance: string;
  address?: string;
}
