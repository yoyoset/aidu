import { describe, it, expect } from 'vitest';
import { ResponseValidator } from './response_validator.js';
import { SENTENCE_SCHEMA } from '../../../utils/schema_constants.js';

describe('ResponseValidator Unit Tests', () => {
    describe('validate() root structure and wrapping', () => {
        it('should correctly parse standard valid structures', () => {
            const raw = {
                sentences: [
                    {
                        original_text: 'Hello world',
                        translation: '你好，世界',
                        explanation: 'Greeting',
                        segments: [['Hello', 'INTJ', 'hello'], ['world', 'NOUN', 'world']],
                        phrasal_verbs: []
                    }
                ]
            };
            const result = ResponseValidator.validate(raw, 2);
            expect(result.sentences.length).toBe(1);
            expect(result.sentences[0].original_text).toBe('Hello world');
            expect(result.sentences[0].segments[0][1]).toBe('INTJ');
        });

        it('should wrap a single sentence object if root sentences array is missing', () => {
            const raw = {
                original_text: 'Hello world',
                translation: '你好，世界',
                explanation: 'Greeting',
                segments: [['Hello', 'INTJ', 'hello'], ['world', 'NOUN', 'world']],
                phrasal_verbs: []
            };
            const result = ResponseValidator.validate(raw, 2);
            expect(result.sentences.length).toBe(1);
            expect(result.sentences[0].original_text).toBe('Hello world');
        });

        it('should accept a raw array of sentences directly', () => {
            const raw = [
                {
                    original_text: 'Hello world',
                    translation: '你好，世界',
                    explanation: 'Greeting',
                    segments: [['Hello', 'INTJ', 'hello'], ['world', 'NOUN', 'world']],
                    phrasal_verbs: []
                }
            ];
            const result = ResponseValidator.validate(raw, 2);
            expect(result.sentences.length).toBe(1);
            expect(result.sentences[0].original_text).toBe('Hello world');
        });

        it('should throw error on invalid non-object input', () => {
            expect(() => ResponseValidator.validate(null, 2)).toThrow();
            expect(() => ResponseValidator.validate("not an object", 2)).toThrow();
        });
    });

    describe('normalizeSentence() fields and segment recovery', () => {
        it('should resolve various alias mappings for sentence fields', () => {
            const raw = {
                original: 'I ran away',
                simplified_chinese: '我跑掉了',
                notes: 'Grammar comment',
                tokens: [['I', 'PRON', 'i'], ['ran', 'VERB', 'run'], ['away', 'ADV', 'away']]
            };
            const result = ResponseValidator.normalizeSentence(raw, 2);
            expect(result[SENTENCE_SCHEMA.original_text]).toBe('I ran away');
            expect(result[SENTENCE_SCHEMA.translation]).toBe('...我跑掉了' ? '我跑掉了' : result[SENTENCE_SCHEMA.translation]);
            expect(result[SENTENCE_SCHEMA.explanation]).toBe('Grammar comment');
        });

        it('should recover segments heuristically via regex tokenizer if segments are missing', () => {
            const raw = {
                original_text: "Don't look back in anger!",
                translation: '不要愤怒地回头看！'
            };
            const result = ResponseValidator.normalizeSentence(raw, 2);
            const segments = result[SENTENCE_SCHEMA.segments];
            expect(segments.length).toBeGreaterThan(0);
            
            // "Don't" should be extracted
            expect(segments[0][0]).toBe("Don't");
            expect(segments[0][1]).toBe("UNKNOWN");
            
            // "!" is punctuation
            const lastSeg = segments[segments.length - 1];
            expect(lastSeg[0]).toBe("!");
            expect(lastSeg[1]).toBe("PUNCT");
        });

        it('should parse object-based segment items and normalize part-of-speech tags', () => {
            const raw = {
                original_text: 'Test word',
                segments: [
                    { word: 'Test', pos: 'NOUN', lemma: 'test' },
                    { w: 'word', tag: 'Verb', l: 'word' }
                ]
            };
            const result = ResponseValidator.normalizeSentence(raw, 2);
            const segments = result[SENTENCE_SCHEMA.segments];
            expect(segments[0]).toEqual(['Test', 'NOUN', 'test']);
            expect(segments[1]).toEqual(['word', 'VERB', 'word']);
        });
    });

    describe('findSequenceIndices() phrase detection', () => {
        const segments = [
            ['I', 'PRON', 'i'],
            ['gave', 'VERB', 'give'],
            ['the', 'DET', 'the'],
            ['difficult', 'ADJ', 'difficult'],
            ['book', 'NOUN', 'book'],
            ['up', 'PART', 'up']
        ];

        it('should find exact contiguous words', () => {
            const words = ['difficult', 'book'];
            const indices = ResponseValidator.findSequenceIndices(words, segments);
            expect(indices).toEqual([3, 4]);
        });

        it('should find non-contiguous phrasal verbs within maximum gap range', () => {
            const words = ['gave', 'up'];
            const indices = ResponseValidator.findSequenceIndices(words, segments);
            expect(indices).toEqual([1, 5]);
        });

        it('should match using lemma words', () => {
            const words = ['give', 'up'];
            const indices = ResponseValidator.findSequenceIndices(words, segments);
            expect(indices).toEqual([1, 5]);
        });

        it('should return null if gap is too large', () => {
            const extraSegments = [
                ['I', 'PRON', 'i'],
                ['gave', 'VERB', 'give'],
                ['a', 'DET', 'a'],
                ['very', 'ADV', 'very'],
                ['long', 'ADJ', 'long'],
                ['and', 'CONJ', 'and'],
                ['extremely', 'ADV', 'extremely'],
                ['boring', 'ADJ', 'boring'],
                ['speech', 'NOUN', 'speech'],
                ['up', 'PART', 'up']
            ];
            const words = ['gave', 'up'];
            const indices = ResponseValidator.findSequenceIndices(words, extraSegments);
            expect(indices).toBeNull();
        });
    });

    describe('repairIndices() with auto-discovery and out-of-bounds protection', () => {
        const segments = [
            ['She', 'PRON', 'she'],
            ['looked', 'VERB', 'look'],
            ['after', 'PREP', 'after'],
            ['the', 'DET', 'the'],
            ['little', 'ADJ', 'little'],
            ['kitten', 'NOUN', 'kitten']
        ];

        it('should repair indices using findSequenceIndices if input indices are all -1', () => {
            const pv = {
                text: 'looked after',
                indices: [-1, -1]
            };
            const repaired = ResponseValidator.repairIndices(pv, segments);
            expect(repaired).toEqual([1, 2]);
        });

        it('should repair indices if indices array is invalid or has wrong length', () => {
            const pv = {
                text: 'looked after',
                indices: [1]
            };
            const repaired = ResponseValidator.repairIndices(pv, segments);
            expect(repaired).toEqual([1, 2]);
        });

        it('should retain original indices if they are valid and correct', () => {
            const pv = {
                text: 'looked after',
                indices: [1, 2]
            };
            const repaired = ResponseValidator.repairIndices(pv, segments);
            expect(repaired).toEqual([1, 2]);
        });

        it('should filter out-of-bounds indices completely to avoid crashes', () => {
            const pv = {
                text: 'looked after',
                indices: [1, 99] // 99 is out-of-bounds
            };
            const repaired = ResponseValidator.repairIndices(pv, segments);
            // 99 should either be corrected to 2 or filtered out if not correctable.
            // Let's verify that the output contains only valid indices (>=0 and < segments.length)
            repaired.forEach(idx => {
                expect(idx).toBeGreaterThanOrEqual(0);
                expect(idx).toBeLessThan(segments.length);
            });
        });
    });
});
