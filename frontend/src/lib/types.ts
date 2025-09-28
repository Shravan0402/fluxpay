// src/lib/types.ts
export interface Question {
    id: string;
    type: 'multiple-choice' | 'text-input' | 'observation';
    questionText: string;
    options?: string[]; // For multiple-choice
    correctAnswer: string | string[]; // Can be a single string or an array for text input variations
    hint?: string;
    points: number;
    highlightArea?: { x: number; y: number; width: number; height: number; }; // For observation questions
  }
  
  export interface Artwork {
    id: string;
    title: string;
    artist: string;
    year: number;
    imageUrl: string; // Path in public/artworks
    isMatureContent: boolean; // Flag for age gate
    description: string; // Short context for correct answers
    questions: Question[];
  }
  
  // src/lib/data.ts
  import { Artwork } from './types';
  
  export const artworksData: Artwork[] = [
    {
      id: 'mona-lisa',
      title: 'Mona Lisa',
      artist: 'Leonardo da Vinci',
      year: 1503,
      imageUrl: '/artworks/mona_lisa.jpg',
      isMatureContent: false,
      description: 'A half-length portrait painting by Italian artist Leonardo da Vinci, widely considered an archetypal masterpiece of the Italian Renaissance.',
      questions: [
        {
          id: 'q1-mona-lisa',
          type: 'multiple-choice',
          questionText: 'Who painted the Mona Lisa?',
          options: ['Vincent van Gogh', 'Leonardo da Vinci', 'Pablo Picasso', 'Claude Monet'],
          correctAnswer: 'Leonardo da Vinci',
          points: 10,
        },
        {
          id: 'q2-mona-lisa',
          type: 'observation',
          questionText: 'What is unique about her smile?',
          correctAnswer: 'The sfumato technique', // This would ideally be visually confirmed or free text
          hint: 'Focus on the corners of her mouth and eyes.',
          points: 20,
          highlightArea: { x: 300, y: 400, width: 50, height: 20 }, // Example coordinates
        }
      ],
    },
    {
      id: 'starry-night',
      title: 'The Starry Night',
      artist: 'Vincent van Gogh',
      year: 1889,
      imageUrl: '/artworks/starry_night.jpg',
      isMatureContent: false,
      description: 'An oil on canvas painting by Dutch Post-Impressionist painter Vincent van Gogh. Painted during his stay at an asylum in Saint-Rémy-de-Provence, France.',
      questions: [
          {
              id: 'q1-starry-night',
              type: 'text-input',
              questionText: 'Which famous post-impressionist painter created "The Starry Night"?',
              correctAnswer: 'Vincent van Gogh',
              points: 15,
          }
      ]
    },
    {
      id: 'birth-of-venus',
      title: 'The Birth of Venus',
      artist: 'Sandro Botticelli',
      year: 1485,
      imageUrl: '/artworks/birth_of_venus.jpg',
      isMatureContent: true, // Example of mature content
      description: 'A painting by the Italian artist Sandro Botticelli, probably executed in the mid 1480s. It depicts the goddess Venus arriving at the shore after her birth, when she had emerged from the sea fully-grown.',
      questions: [
          {
              id: 'q1-birth-of-venus',
              type: 'multiple-choice',
              questionText: 'What mythical figure is at the center of this painting?',
              options: ['Juno', 'Minerva', 'Venus', 'Diana'],
              correctAnswer: 'Venus',
              points: 10,
          }
      ]
    }
  ];
  
  // In a real app, you might fetch this from an API endpoint `/api/artworks`
  // For this tutorial, we'll import directly.