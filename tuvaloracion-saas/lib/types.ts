import { ObjectId } from 'mongodb';

// Business types
export interface Business {
  _id?: string
  subdomain: string
  name: string
  type: string
  category: string
  phone: string
  email: string
  address: string
  googleReviewUrl: string
  plan: 'trial' | 'basic' | 'premium'
  active: boolean  // Cambiado de isActive a active para coincidir con la BD
  createdAt: Date
  updatedAt: Date
  config: {
    theme: {
      primaryColor: string
      secondaryColor: string
      bgPrimary?: string
      bgSecondary?: string
      buttonPrimary?: string
      buttonSecondary?: string
    }
    rouletteColors?: string[]
    languages: string[]
    prizes: Prize[]
    googleReviewUrl?: string
    tripadvisorReviewUrl?: string
    reviewPlatform?: 'google' | 'tripadvisor' | 'alternating'
    reviewClickCounter?: number
    googleStats?: {
      currentRating?: number
      totalReviews?: number
    }
    tripadvisorStats?: {
      currentRating?: number
      totalReviews?: number
    }
    features?: {
      showScarcityIndicators?: boolean
      showPrizeWheel?: boolean
      requireGoogleReview?: boolean
    }
    customTexts?: {
      [language: string]: {
        [key: string]: string
      }
    }
    webhooks?: {
      saveLeadUrl?: string
      verifyEmailUrl?: string
      getOpinionsUrl?: string
    }
  }
}

export interface Prize {
  index: number;
  value?: string;
  translations: {
    [lang: string]: {
      name: string;
      emoji: string;
    };
  };
}

export interface CustomTexts {
  [lang: string]: {
    title?: string;
    title_part1?: string;
    title_part2?: string;
    ratingInstruction?: string;
    emailLabel?: string;
    nameLabel?: string;
    feedbackLabel?: string;
    [key: string]: string | undefined;
  };
}

export interface Features {
  showScarcityIndicators?: boolean;
  requireGoogleReview?: boolean;
  customPrizes?: boolean;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
}

export interface Subscription {
  plan: 'trial' | 'basic' | 'premium' | 'enterprise';
  validUntil: Date;
  status: 'active' | 'inactive' | 'suspended';
}

export interface BusinessStats {
  totalOpinions: number;
  totalPrizesGiven: number;
  avgRating: number;
  lastOpinion?: Date;
}

// Opinion types
export interface Opinion {
  _id?: ObjectId;
  businessId: ObjectId;
  subdomain: string;
  customer: CustomerInfo;
  rating: number;
  review?: string;
  prize: PrizeWon;
  metadata: OpinionMetadata;
  externalReview: boolean;
  createdAt: Date;
}

export interface CustomerInfo {
  name: string;
  email: string;
}

export interface PrizeWon {
  index: number;
  name: string;
  code: string;
  value?: string;
}

export interface OpinionMetadata {
  language: string;
  userAgent?: string;
  ip?: string;
  referrer?: string;
}

// User types
export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'viewer';
  businessId?: ObjectId;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types
export interface LeadFormData {
  name: string;
  email: string;
  feedback?: string;
  rating: number;
  businessId: string;
  language: string;
}

// Email validation
export interface EmailValidation {
  _id?: ObjectId;
  email: string;
  businessId: ObjectId;
  usedAt: Date;
}

// Google Places API types
export interface GoogleReview {
  author_name: string;
  author_url?: string;
  language: string;
  profile_photo_url: string;
  rating: number; // 1-5
  relative_time_description: string; // "hace 2 meses"
  text: string; // Texto completo de la reseña
  time: number; // Timestamp Unix
  translated?: boolean;
}

export interface GooglePlaceData {
  name?: string;
  rating?: number;
  user_ratings_total?: number;
  reviews?: GoogleReview[];
  formatted_address?: string;
  international_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now: boolean;
    periods: Array<{
      close: { day: number; time: string };
      open: { day: number; time: string };
    }>;
    weekday_text: string[];
  };
  photos?: Array<{
    height: number;
    width: number;
    photo_reference: string;
  }>;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface GooglePlacesApiResponse {
  success: boolean;
  data?: GooglePlaceData;
  error?: string;
  placeId?: string;
}

export interface GooglePlacesRequest {
  placeId?: string;
  url?: string;
  fields?: string[];
  language?: string;
}

// Google Places Autocomplete types
export interface AutocompleteResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export interface AutocompleteApiResponse {
  success: boolean;
  predictions?: AutocompleteResult[];
  error?: string;
}

export interface PlacePhotoRequest {
  photo_reference: string;
  maxwidth?: number;
  maxheight?: number;
}

export interface PlacePhotoResponse {
  success: boolean;
  photo_url?: string;
  error?: string;
}

// Available Google Places API fields
export const GOOGLE_PLACES_FIELDS = {
  BASIC: ['name', 'rating', 'user_ratings_total'],
  CONTACT: ['formatted_address', 'international_phone_number', 'website'],
  ATMOSPHERE: ['opening_hours', 'price_level'],
  REVIEWS: ['reviews'],
  PHOTOS: ['photos'],
  ALL: ['name', 'rating', 'user_ratings_total', 'reviews', 'formatted_address', 'international_phone_number', 'website', 'opening_hours', 'photos']
} as const;

// Default templates
export const BUSINESS_TEMPLATES = {
  restaurante: {
    prizes: [
      { index: 0, value: '60€', emoji: '🍽️' },
      { index: 1, value: '30€', emoji: '💰' },
      { index: 2, value: '25€', emoji: '🍾' },
      { index: 3, value: '10€', emoji: '🍦' },
      { index: 4, value: '5€', emoji: '🍺' },
      { index: 5, value: '3€', emoji: '🥤' },
      { index: 6, value: '8€', emoji: '🍹' },
      { index: 7, value: '2€', emoji: '🥃' }
    ]
  },
  cafeteria: {
    prizes: [
      { index: 0, value: '30€', emoji: '☕' },
      { index: 1, value: '20€', emoji: '💰' },
      { index: 2, value: '15€', emoji: '🥐' },
      { index: 3, value: '8€', emoji: '🧁' },
      { index: 4, value: '5€', emoji: '🍰' },
      { index: 5, value: '3€', emoji: '🥤' },
      { index: 6, value: '6€', emoji: '🥪' },
      { index: 7, value: '2€', emoji: '🍪' }
    ]
  },
  peluqueria: {
    prizes: [
      { index: 0, value: '45€', emoji: '✂️' },
      { index: 1, value: '30€', emoji: '🎨' },
      { index: 2, value: '35€', emoji: '💆‍♀️' },
      { index: 3, value: '20€', emoji: '💅' },
      { index: 4, value: '15€', emoji: '🧴' },
      { index: 5, value: '10€', emoji: '💇‍♀️' },
      { index: 6, value: '25€', emoji: '✨' },
      { index: 7, value: '5€', emoji: '🎁' }
    ]
  },
  gimnasio: {
    prizes: [
      { index: 0, value: '50€', emoji: '💪' },
      { index: 1, value: '30€', emoji: '🏃‍♂️' },
      { index: 2, value: '40€', emoji: '🧘‍♀️' },
      { index: 3, value: '25€', emoji: '🥤' },
      { index: 4, value: '20€', emoji: '📊' },
      { index: 5, value: '15€', emoji: '👕' },
      { index: 6, value: '35€', emoji: '💆‍♂️' },
      { index: 7, value: '10€', emoji: '🎯' }
    ]
  }
};
