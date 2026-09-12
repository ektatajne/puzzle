
import type { ImageTask, Difficulty } from './types';

export const IMAGE_PROMPTS: Record<Difficulty, ImageTask[]> = {
  Easy: [
    {
      title: 'A Red Apple',
      prompt: 'A single, shiny red apple on a white background. Photorealistic style.',
    },
    {
      title: 'Sunny Beach',
      prompt: 'A cartoon drawing of a sunny beach with a yellow sun, blue ocean, and a single palm tree.',
    },
    {
      title: 'A Cute Cat',
      prompt: 'A fluffy orange cat sleeping on a blue cushion. Soft, gentle lighting.',
    },
  ],
  Medium: [
    {
      title: 'Robot Gardener',
      prompt: 'A friendly, retro-style robot tending to a garden of colorful flowers on a sunny rooftop with a city skyline in the background.',
    },
    {
      title: 'Knight\'s Quest',
      prompt: 'A knight in shining armor on a white horse, looking at a castle on a hill under a blue sky. Oil painting style.',
    },
    {
      title: 'City in a Bottle',
      prompt: 'A miniature fantasy city inside a glass bottle sitting on a wooden table. Sunlight streams through a window, illuminating the bottle.',
    },
    {
      title: 'Fox in the Snow',
      prompt: 'A red fox curled up asleep in the snow during a gentle snowfall. A cozy, serene winter scene.',
    },
    {
      title: 'Astronaut on Mars',
      prompt: 'An astronaut planting a flag on the rocky, red surface of Mars. The Earth is a small blue dot in the dark sky. Realistic sci-fi style.',
    },
  ],
  Hard: [
    {
        title: 'Treehouse Library',
        prompt: 'A cozy library inside a large treehouse, with books on wooden shelves and a comfortable armchair by a round window. Warm and inviting mood.',
    },
    {
      title: 'Steampunk Explorer',
      prompt: 'An explorer wearing vintage goggles and a leather jacket stands in a lush jungle, looking at an old map. Steampunk illustration.',
    },
    {
      title: 'Ghostly Pirate Ship',
      prompt: 'A glowing, translucent pirate ship sailing on a calm sea under a full moon. Mysterious and eerie atmosphere.',
    },
    {
      title: 'Enchanted Forest Path',
      prompt: 'A path of glowing mushrooms lighting the way through an enchanted, misty forest at night. Fireflies are dancing in the air.',
    },
    {
      title: 'Metropolis of Tomorrow',
      prompt: 'A bustling, futuristic metropolis at night with flying vehicles, holographic advertisements, and towering chrome skyscrapers reaching into a starry sky. Cyberpunk aesthetic.'
    },
  ]
};
