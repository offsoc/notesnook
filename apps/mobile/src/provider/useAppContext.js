import {useContext} from 'react';
import {AppContext} from '.';
import {StatusBar} from 'react-native';
import {
  COLOR_SCHEME,
  setColorScheme,
  getColorScheme,
  ACCENT,
} from '../common/common';
import {db} from '../../App';

const useAppContext = () => {
  const [state, dispatch] = useContext(AppContext);

  if (dispatch === undefined) {
    throw new Error('Must have dispatch defined');
  }

  // Themeing

  async function updateAppTheme(colors = state.colors) {
    let newColors = await getColorScheme(colors);
    dispatch(draft => {
      draft.colors = {...newColors};
    });
  }

  function changeColorScheme(colors = COLOR_SCHEME, accent = ACCENT) {
    let newColors = setColorScheme(colors, accent);
    StatusBar.setBarStyle(newColors.night ? 'light-content' : 'dark-content');

    dispatch(draft => {
      draft.colors = {...newColors};
    });
  }

  function changeAccentColor(accentColor) {
    ACCENT.color = accentColor;
    ACCENT.shade = accentColor + '12';
    changeColorScheme();
  }

  // Handling Selection Items

  function changeSelectionMode(enabled) {
    dispatch(draft => {
      draft.selectionMode = enabled;
      if (!enabled) {
        draft.selectedItemsList = [...[]];
      }
    });
  }
  function updateSelectionList(item) {
    let selectedItems = [...state.selectedItemsList];

    if (selectedItems.includes(item)) {
      selectedItems.splice(selectedItems.indexOf(item), 1);
    } else {
      selectedItems.push(item);
    }

    dispatch(draft => {
      draft.selectedItemsList = selectedItems;
    });
  }

  // Database Control

  function updateNotes() {
    dispatch(draft => {
      draft.notes = db.groupNotes();
    });
  }
  function updateNotebooks() {
    dispatch(draft => {
      draft.notes = db.getNotebooks();
    });
  }

  function updateTrash() {
    dispatch(draft => {
      draft.notes = db.getTrash();
    });
  }

  function updateFavorites() {
    dispatch(draft => {
      draft.notes = db.getFavorites();
    });
  }

  function updatePinned() {
    dispatch(draft => {
      draft.notes = db.getPinned();
    });
  }

  return {
    ...state,
    updateAppTheme,
    changeColorScheme,
    changeAccentColor,
    changeSelectionMode,
    updateSelectionList,
    updateNotes,
    updateNotebooks,
    updateFavorites,
    updatePinned,
    updateTrash,
  };
};

export {useAppContext};
