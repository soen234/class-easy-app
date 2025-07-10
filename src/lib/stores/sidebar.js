import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Create a store for sidebar collapsed state
function createSidebarStore() {
  // Get initial state from localStorage
  const initialState = browser ? localStorage.getItem('sidebarCollapsed') === 'true' : false;
  
  const { subscribe, set, update } = writable(initialState);
  
  return {
    subscribe,
    toggle: () => update(collapsed => {
      const newState = !collapsed;
      if (browser) {
        localStorage.setItem('sidebarCollapsed', newState.toString());
      }
      return newState;
    }),
    setCollapsed: (collapsed) => {
      set(collapsed);
      if (browser) {
        localStorage.setItem('sidebarCollapsed', collapsed.toString());
      }
    }
  };
}

export const sidebarCollapsed = createSidebarStore();