import { describe, expect, it } from 'vitest';

import { pickOrbitNotes, orbitSlot } from './orbit';

const dummyFiles: Readonly<Record<string, string>> = {
  n1: 'n1.webp',
  n2: 'n2.webp',
  n3: 'n3.webp',
  n4: 'n4.webp',
  n5: 'n5.webp',
  n6: 'n6.webp',
  n7: 'n7.webp',
};

const createRow = (pyramidLayer: string, slug: string, iconUrl: string | null = null) => ({
  pyramidLayer,
  note: { slug, name: { ru: `Ru ${slug}`, en: `En ${slug}` }, iconUrl },
});

describe('orbitSlot', () => {
  it('places slots on the first ellipse, clear of the cap at 90° and the base at 270°', () => {
    expect(orbitSlot(0)).toEqual({ left: 20.89, top: 26.86 });
    expect(orbitSlot(4)).toEqual({ left: 12, top: 50 });
    expect(orbitSlot(5)).toEqual({ left: 88, top: 50 });
  });

  it('throws past the last slot instead of drawing a badge at a made-up angle', () => {
    expect(() => orbitSlot(6)).toThrow(RangeError);
  });
});

describe('pickOrbitNotes', () => {
  it('reads top → middle → base, counting heart as middle, so the orbit opens the way the scent does', () => {
    const rows = [createRow('base', 'n3'), createRow('heart', 'n2'), createRow('top', 'n1')];
    const notes = pickOrbitNotes(rows, 'en', dummyFiles);
    expect(notes.map((n) => n.slug)).toEqual(['n1', 'n2', 'n3']);
  });

  it('falls back to the photograph the product page shows, so a perfume orbits without our own cut-outs', () => {
    const rows = [
      createRow('top', 'amber', '/notes/prod/amber.jpg'),
      createRow('middle', 'n2', '/notes/prod/n2.jpg'),
      createRow('base', 'vetiver', '/notes/prod/vetiver.jpg'),
    ];
    const notes = pickOrbitNotes(rows, 'en', dummyFiles);
    expect(notes.map(({ slug, image, cutout }) => ({ slug, image, cutout }))).toEqual([
      { slug: 'amber', image: '/notes/prod/amber.jpg', cutout: false },
      { slug: 'n2', image: '/notes/orbit/n2.webp', cutout: true },
      { slug: 'vetiver', image: '/notes/prod/vetiver.jpg', cutout: false },
    ]);
  });

  it("gives our own cut-outs the six places first, so Ombre Nomade's approved orbit keeps its oud", () => {
    // Ombre Nomade: six cut-outs, and a photographed amber listed in the base before the oud.
    const rows = [
      createRow('top', 'n1'),
      createRow('top', 'n2'),
      createRow('middle', 'n3'),
      createRow('middle', 'n4'),
      createRow('middle', 'n5'),
      createRow('base', 'amber', '/notes/prod/amber.jpg'),
      createRow('base', 'n6'),
    ];
    const notes = pickOrbitNotes(rows, 'en', dummyFiles);
    expect(notes.map((n) => n.slug)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
  });

  it('fills the places the cut-outs leave with photographs, still in the order the scent unfolds', () => {
    const rows = [
      createRow('top', 'lemon', '/notes/prod/lemon.jpg'),
      createRow('top', 'bergamot', '/notes/prod/bergamot.jpg'),
      createRow('top', 'lime', '/notes/prod/lime.jpg'),
      createRow('middle', 'n1'),
      createRow('middle', 'jasmine', '/notes/prod/jasmine.jpg'),
      createRow('base', 'n2'),
      createRow('base', 'n3'),
      createRow('base', 'musk', '/notes/prod/musk.jpg'),
    ];
    const notes = pickOrbitNotes(rows, 'en', dummyFiles);
    expect(notes.map((n) => n.slug)).toEqual(['lemon', 'bergamot', 'lime', 'n1', 'n2', 'n3']);
  });

  it('skips notes with no picture at all, so a badge never shows an empty frame', () => {
    const rows = [
      createRow('top', 'n1'),
      createRow('middle', 'unillustrated'),
      createRow('base', 'n3'),
      createRow('base', 'n4'),
    ];
    const notes = pickOrbitNotes(rows, 'en', dummyFiles);
    expect(notes.map((n) => n.slug)).toEqual(['n1', 'n3', 'n4']);
  });

  it('keeps one badge per note, because a note listed in two layers is still one ingredient', () => {
    const rows = [
      createRow('top', 'n1'),
      createRow('middle', 'n2'),
      createRow('base', 'n3'),
      createRow('base', 'n1'),
    ];
    const notes = pickOrbitNotes(rows, 'en', dummyFiles);
    expect(notes.map((n) => n.slug)).toEqual(['n1', 'n2', 'n3']);
  });

  it('stops at six, the number of slots that stay clear of the cap and the base', () => {
    const rows = [
      createRow('top', 'n1'),
      createRow('top', 'n2'),
      createRow('middle', 'n3'),
      createRow('middle', 'n4'),
      createRow('base', 'n5'),
      createRow('base', 'n6'),
      createRow('base', 'n7'),
    ];
    const notes = pickOrbitNotes(rows, 'en', dummyFiles);
    expect(notes.length).toBe(6);
    expect(notes.map((n) => n.slug)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
  });

  it('drops the orbit below three notes, because two badges read as a broken orbit', () => {
    const rows = [createRow('top', 'n1'), createRow('base', 'n2')];
    const notes = pickOrbitNotes(rows, 'en', dummyFiles);
    expect(notes).toEqual([]);

    const rows3 = [createRow('top', 'n1'), createRow('middle', 'n2'), createRow('base', 'n3')];
    const notes3 = pickOrbitNotes(rows3, 'en', dummyFiles);
    expect(notes3.length).toBe(3);
  });

  it("points at the public orbit file and names the note in the reader's language", () => {
    const rows = [createRow('top', 'n1'), createRow('middle', 'n2'), createRow('base', 'n3')];
    const notes = pickOrbitNotes(rows, 'en', dummyFiles);
    expect(notes[0]).toMatchObject({ image: '/notes/orbit/n1.webp', name: 'En n1' });
    expect(pickOrbitNotes(rows, 'ru', dummyFiles)[0]).toMatchObject({ name: 'Ru n1' });
  });
});
