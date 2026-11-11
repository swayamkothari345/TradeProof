import { z } from 'zod';

const optionSchema = z.object({
  optionText: z.string().min(1, 'Option text is required').max(500),
  isCorrect: z.boolean().default(false),
  orderIndex: z.number().int().optional().default(0),
});

const questionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required').max(1000),
  explanation: z.string().max(2000).optional().nullable(),
  orderIndex: z.number().int().optional().default(0),
  marks: z.number().int().positive().optional().default(1),
  options: z.array(optionSchema).min(2, 'At least 2 options required').max(6),
});

export const createTestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  topic: z.string().min(1, 'Topic is required').max(100),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional().default('BEGINNER'),
  durationMin: z.number().int().min(1).max(180).optional().default(30),
  isSelfTest: z.boolean().optional().default(false),
  questions: z.array(questionSchema).optional().default([]),
});

export const submitAnswersSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    selectedOptionId: z.string().optional().nullable(),
  })).min(1, 'At least one answer is required'),
});

export const assignTestSchema = z.object({
  assignedTo: z.string().optional().nullable(),
  cohortId: z.string().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
}).refine(d => d.assignedTo || d.cohortId, {
  message: 'Either assignedTo (user) or cohortId must be provided',
});
