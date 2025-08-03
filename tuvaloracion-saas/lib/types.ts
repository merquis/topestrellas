import { ObjectId } from 'mongodb';

// Business types
export interface Business {
  _id?: ObjectId;
  subdomain: string;
  name: string;
  type: 'restaurante' | 'peluqueria' | 'gimnasio' | 'clinica' | 'taller' | 'otro';
  category?: string;
  config: BusinessConfig;
  contact?: ContactInfo;
  subscription: Subscription;
  stats?: BusinessStats;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessConfig {
  languages: string[];
  defaultLanguage: string;
  googleReviewUrl?: string;
  websiteUrl?: string;
  theme: Theme;
  prizes: Prize[];
  customTexts?: CustomTexts;
  features?: Features;
}

export interface Theme {
  primaryColor: string;
  secondaryColor?: string;
  logo?: string;
  backgroundImage?: string;
  font?: string;
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
