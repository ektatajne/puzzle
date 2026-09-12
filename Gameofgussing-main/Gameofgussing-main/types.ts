export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface ImageTask {
  title: string;
  prompt: string;
}

export interface AnalysisResult {
  accuracy: number;
  rating: number;
  suggestions: string[];
}

export interface Player {
  id: string;
  name: string;
  prompt: string;
  submitted: boolean;
  result: AnalysisResult | null;
  generatedImage: string | null;
}