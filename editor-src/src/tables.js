// Table editing primitives. The right-click menu itself is a native WPF menu in
// the host; here we expose the commands it invokes plus the cell-edit behavior
// (clear on Backspace/Delete, replace on typing). Anything more elaborate is left
// to direct markdown editing.

import { $prose, callCommand } from '@milkdown/kit/utils';
import { Plugin, TextSelection } from '@milkdown/kit/prose/state';
import {
  CellSelection, selectionCell, selectedRect, isInTable,
  addColumnBefore, addColumnAfter, addRowBefore, addRowAfter,
  deleteColumn, deleteRow, deleteTable, deleteCellSelection,
} from '@milkdown/kit/prose/tables';
import { insertTableCommand } from '@milkdown/kit/preset/gfm';

const selectCol = (state, dispatch) => {
  if (!isInTable(state)) return false;
  if (dispatch) dispatch(state.tr.setSelection(CellSelection.colSelection(selectionCell(state))));
  return true;
};
const selectRow = (state, dispatch) => {
  if (!isInTable(state)) return false;
  if (dispatch) dispatch(state.tr.setSelection(CellSelection.rowSelection(selectionCell(state))));
  return true;
};
const selectTable = (state, dispatch) => {
  if (!isInTable(state)) return false;
  const rect = selectedRect(state);
  const cells = rect.map.map;
  const first = rect.tableStart + cells[0];
  const last = rect.tableStart + cells[cells.length - 1];
  if (dispatch) dispatch(state.tr.setSelection(CellSelection.create(state.doc, first, last)));
  return true;
};

const COMMANDS = {
  colLeft: addColumnBefore,
  colRight: addColumnAfter,
  rowAbove: addRowBefore,
  rowBelow: addRowAfter,
  delCol: deleteColumn,
  delRow: deleteRow,
  delTable: deleteTable,
  selCol: selectCol,
  selRow: selectRow,
  selTable: selectTable,
};

export function runTableCommand(view, name) {
  const cmd = COMMANDS[name];
  if (cmd) { cmd(view.state, view.dispatch); view.focus(); }
}

// Resolve a document coordinate to a table cell and put the cursor there so the
// menu commands target it. Returns true if the point is inside a table.
export function focusTableCell(view, clientX, clientY) {
  const at = view.posAtCoords({ left: clientX, top: clientY });
  if (!at) return false;
  const $p = view.state.doc.resolve(at.pos);
  let inTable = false;
  for (let d = $p.depth; d > 0; d--) if ($p.node(d).type.spec.tableRole) { inTable = true; break; }
  if (!inTable) return false;
  if (!(view.state.selection instanceof CellSelection)) {
    view.dispatch(view.state.tr.setSelection(TextSelection.near($p)));
  }
  return true;
}

export const isSelectionInTable = (state) => isInTable(state);

// Backspace/Delete clears selected cells; typing replaces their content.
export const tableCellEditing = $prose(() => new Plugin({
  props: {
    handleKeyDown(view, event) {
      if (event.key !== 'Backspace' && event.key !== 'Delete') return false;
      if (!(view.state.selection instanceof CellSelection)) return false;
      return deleteCellSelection(view.state, view.dispatch);
    },
    handleTextInput(view, _from, _to, text) {
      const sel = view.state.selection;
      if (!(sel instanceof CellSelection)) return false;
      const anchorPos = sel.$anchorCell.pos;
      const tr = view.state.tr;
      const cells = [];
      sel.forEachCell((node, pos) => cells.push({ node, pos }));
      const paragraph = view.state.schema.nodes.paragraph;
      for (let i = cells.length - 1; i >= 0; i--) {
        const { node, pos } = cells[i];
        tr.replaceWith(pos + 1, pos + node.nodeSize - 1, paragraph.create());
      }
      const inner = tr.mapping.map(anchorPos) + 2;
      tr.setSelection(TextSelection.create(tr.doc, inner));
      tr.insertText(text, inner);
      view.dispatch(tr.scrollIntoView());
      return true;
    },
  },
}));

// GFM tables always have a header row (row 0); add an extra row when the caller
// does not want one so the requested body-row count still fits.
export function insertTableAction(editor, rows, cols, header) {
  const total = header ? rows : rows + 1;
  editor.action(callCommand(insertTableCommand.key, { row: Math.max(total, 2), col: Math.max(cols, 1) }));
}
