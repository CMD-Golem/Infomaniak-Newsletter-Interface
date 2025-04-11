var Module = Quill.import("modules/table");


class Table extends Module {
	static register() {
		Quill.register(TableCell);
		Quill.register(TableRow);
		Quill.register(TableBody);
		Quill.register(TableContainer);
	  }
	constructor() {
		console.log("constructor")
		super(...arguments), this.listenBalanceCells()
	}
	balanceTables() {
		console.log("balanceTables")
		this.quill.scroll.descendants(et).forEach((t => {
			t.balanceCells()
		}))
	}
	deleteColumn() {
		console.log("deleteColumn")
		const [t, , e] = this.getTable();
		null != e && (t.deleteColumn(e.cellOffset()), this.quill.update(p.Ay.sources.USER))
	}
	deleteRow() {
		console.log("deleteRow")
		const [, t] = this.getTable();
		null != t && (t.remove(), this.quill.update(p.Ay.sources.USER))
	}
	deleteTable() {
		console.log("deleteTable")
		const [t] = this.getTable();
		if (null == t) return;
		const e = t.offset();
		t.remove(), this.quill.update(p.Ay.sources.USER), this.quill.setSelection(e, p.Ay.sources.SILENT)
	}
	getTable() {
		console.log("getTable")
		let t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : this.quill.getSelection();
		if (null == t) return [null, null, null, -1];
		const [e, n] = this.quill.getLine(t.index);
		if (null == e || e.statics.blotName !== J.blotName) return [null, null, null, -1];
		const r = e.parent;
		return [r.parent.parent, r, e, n]
	}
	insertColumn(t) {
		console.log("insertColumn")
		const e = this.quill.getSelection();
		if (!e) return;
		const [n, r, i] = this.getTable(e);
		if (null == i) return;
		const s = i.cellOffset();
		n.insertColumn(s + t), this.quill.update(p.Ay.sources.USER);
		let o = r.rowOffset();
		0 === t && (o += 1), this.quill.setSelection(e.index + o, e.length, p.Ay.sources.SILENT)
	}
	insertColumnLeft() {
		console.log("insertColumnLeft")
		this.insertColumn(0)
	}
	insertColumnRight() {
		console.log("insertColumnRight")
		this.insertColumn(1)
	}
	insertRow(t) {
		console.log("insertRow")
		const e = this.quill.getSelection();
		if (!e) return;
		const [n, r, i] = this.getTable(e);
		if (null == i) return;
		const s = r.rowOffset();
		n.insertRow(s + t), this.quill.update(p.Ay.sources.USER), t > 0 ? this.quill.setSelection(e, p.Ay.sources.SILENT) : this.quill.setSelection(e.index + r.children.length, e.length, p.Ay.sources.SILENT)
	}
	insertRowAbove() {
		console.log("insertRowAbove")
		this.insertRow(0)
	}
	insertRowBelow() {
		console.log("insertRowBelow")
		this.insertRow(1)
	}
	insertTable(t, e) {
		console.log("insertTable")
		const n = this.quill.getSelection();
		if (null == n) return;
		const r = new Array(t).fill(0).reduce((t => {
			const n = new Array(e).fill("\n").join("");
			return t.insert(n, {
				table: nt()
			})
		}), (new(z())).retain(n.index));
		this.quill.updateContents(r, p.Ay.sources.USER), this.quill.setSelection(n.index, p.Ay.sources.SILENT), this.balanceTables()
	}
	listenBalanceCells() {
		console.log("listenBalanceCells")
		this.quill.on(p.Ay.events.SCROLL_OPTIMIZE, (t => {
			t.some((t => !!["TD", "TR", "TBODY", "TABLE"].includes(t.target.tagName) && (this.quill.once(p.Ay.events.TEXT_CHANGE, ((t, e, n) => {
				n === p.Ay.sources.USER && this.balanceTables()
			})), !0)))
		}))
	}
}

Quill.register(Table);