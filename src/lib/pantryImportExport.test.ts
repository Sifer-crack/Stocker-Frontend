import { describe, expect, it } from 'vitest'
import { parsePantryExport } from './pantryImportExport'

describe('parsePantryExport', () => {
    it('accepts a valid pantry export', () => {
        const json = JSON.stringify({
            format: 'stocker-pantry',
            version: 1,
            exportedAt: '2026-10-20T00:00:00.000Z',
            items: [
                {
                    productName: 'Anchor Milk',
                    quantity: 2,
                    unit: '2 L',
                    category: 'Dairy',
                },
            ],
        })

        expect(parsePantryExport(json)).toEqual({
            format: 'stocker-pantry',
            version: 1,
            exportedAt: '2026-10-20T00:00:00.000Z',
            items: [
                {
                    productName: 'Anchor Milk',
                    quantity: 2,
                    unit: '2 L',
                    category: 'Dairy',
                },
            ],
        })
    })

    it('accepts an empty pantry', () => {
        const json = JSON.stringify({
            format: 'stocker-pantry',
            version: 1,
            exportedAt: '2026-10-20T00:00:00.000Z',
            items: [],
        })

        expect(parsePantryExport(json).items).toEqual([])
    })

    it('rejects invalid JSON', () => {
        expect(() => parsePantryExport('{invalid json')).toThrow()
    })

    it('rejects an unsupported file format', () => {
        const json = JSON.stringify({
            format: 'other-format',
            version: 1,
            exportedAt: '2026-10-20T00:00:00.000Z',
            items: [],
        })

        expect(() => parsePantryExport(json)).toThrow()
    })

    it('rejects an unsupported version', () => {
        const json = JSON.stringify({
            format: 'stocker-pantry',
            version: 99,
            exportedAt: '2026-10-20T00:00:00.000Z',
            items: [],
        })

        expect(() => parsePantryExport(json)).toThrow()
    })

    it('rejects negative quantities', () => {
        const json = JSON.stringify({
            format: 'stocker-pantry',
            version: 1,
            exportedAt: '2026-10-20T00:00:00.000Z',
            items: [
                {
                    productName: 'Anchor Milk',
                    quantity: -1,
                    unit: '2 L',
                    category: 'Dairy',
                },
            ],
        })

        expect(() => parsePantryExport(json)).toThrow()
    })

    it('rejects items without a product name', () => {
        const json = JSON.stringify({
            format: 'stocker-pantry',
            version: 1,
            exportedAt: '2026-10-20T00:00:00.000Z',
            items: [
                {
                    quantity: 2,
                    unit: '2 L',
                    category: 'Dairy',
                },
            ],
        })

        expect(() => parsePantryExport(json)).toThrow()
    })
})