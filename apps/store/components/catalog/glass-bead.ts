// The glass bead a note sits in — on the card orbit (note-orbit.tsx) and in the
// product page's notes (olfactive-pyramid-view.tsx), so the two show one object.
// Plain strings in a plain module: the orbit is a client component, and a server
// component importing a value from a 'use client' file gets a reference, not the value.

// A clear bead: nearly clear through the middle, bright at the rim, shade at the
// bottom, a soft shadow under it; then its highlight, laid over the ingredient.
export const BEAD =
  'absolute inset-[9%] rounded-[50%] bg-[radial-gradient(circle_at_50%_40%,rgb(255_255_255/.22),rgb(255_255_255/.12)_58%,rgb(255_255_255/.7)_100%)] shadow-[inset_0_0_0_1px_rgb(255_255_255/.95),0_0_0_1px_rgb(140_115_80/.25),inset_0_-10px_16px_-6px_rgb(110_85_45/.18),0_12px_18px_-10px_rgb(40_28_12/.4)] dark:bg-[radial-gradient(circle_at_50%_40%,rgb(255_255_255/.06),rgb(255_255_255/.03)_58%,rgb(255_255_255/.16)_100%)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/.25),0_12px_18px_-10px_rgb(0_0_0/.7)]';
export const GLINT =
  'absolute inset-[9%] rounded-[50%] bg-[radial-gradient(ellipse_46%_28%_at_36%_20%,rgb(255_255_255/.8),transparent_72%),radial-gradient(ellipse_40%_14%_at_60%_88%,rgb(255_255_255/.35),transparent_70%)] dark:bg-[radial-gradient(ellipse_46%_28%_at_36%_20%,rgb(255_255_255/.3),transparent_72%)]';
