// Registry of 3D assets served from /public/models.
// - BUILDING_MODEL: the whole structure (shown for "Whole Building").
// - ROOM_MODEL_DEFAULT: a generic room, shown when a room is selected but has
//   no dedicated model yet.
// - ROOM_MODELS: per-room overrides, keyed by room id (see ROOMS in mockData).
//   Add entries as you upload models to /public/models/rooms/.

export const BUILDING_MODEL = '/models/main-building.glb'

// Generic room model used as the fallback for any selected room.
export const ROOM_MODEL_DEFAULT = '/models/Room.glb'

// Map room id -> per-room model path. Example:
//   library: '/models/rooms/library.glb'
export const ROOM_MODELS = {
  // library: '/models/rooms/library.glb',
}

// true if the room has its own dedicated model (vs. the generic room model).
export function hasDedicatedModel(roomId) {
  return roomId in ROOM_MODELS
}

// Resolve the model URL for a selection. Pass null for the whole building.
export function modelForRoom(roomId) {
  if (!roomId) return BUILDING_MODEL
  return ROOM_MODELS[roomId] ?? ROOM_MODEL_DEFAULT
}
