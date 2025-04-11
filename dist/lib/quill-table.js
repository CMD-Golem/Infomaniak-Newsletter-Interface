var Block = Quill.import("blots/block");
var Container = Quill.import("blots/container");

class TableCell extends Block {
	static blotName = "table";
	static tagName = "TD";
	static create(value) {
		var node = super.create();
		console.log("create")
		node.setAttribute("style", value.style);
		if (value) { node.setAttribute('data-row', value); }
		else {
			var id = "row-" + Math.random().toString(36).slice(2, 6);
			node.setAttribute('data-row', id);
		}
		return node;
	}
	static formats(value) {
		console.log("formats")
		if (value.hasAttribute("data-row")) return value.getAttribute("data-row")
	}
	cellOffset() {
		console.log("cellOffset")
		return this.parent ? this.parent.children.indexOf(this) : -1
	}
	format(name, value) {
		console.log("format")
		name === TableCell.blotName && value ? this.domNode.setAttribute("data-row", value) : super.format(name, value)
	}
	row() {
		console.log("row")
		return this.parent
	}
	rowOffset() {
		console.log("rowOffset")
		return this.row() ? this.row().rowOffset() : -1
	}
	table() {
		console.log("table")
		return this.row() && this.row().table()
	}
}
class TableRow extends Container {
	static blotName = "table-row";
	static tagName = "TR";
	checkMerge() {
		console.log("checkMerge")
		if (super.checkMerge() && null != this.next.children.head) {
			const thisHead = this.children.head.formats(),
				thisTail = this.children.tail.formats(),
				nextHead = this.next.children.head.formats(),
				nextTail = this.next.children.tail.formats();
			return thisHead.table === thisTail.table && thisHead.table === nextHead.table && thisHead.table === nextTail.table
		}
		return !1
	}
	optimize(context) {
		console.log("optimize")
		super.optimize(context), this.children.forEach((context => {
			if (null == context.next) return;
			const childFormats = context.formats(),
				nextFormats = context.next.formats();
			if (childFormats.table !== nextFormats.table) {
				const childFormats = this.splitAfter(context);
				childFormats && childFormats.optimize(), this.prev && this.prev.optimize()
			}
		}))
	}
	rowOffset() {
		console.log("rowOffset")
		return this.parent ? this.parent.children.indexOf(this) : -1
	}
	table() {
		console.log("table")
		return this.parent && this.parent.parent
	}
}
class TableBody extends Container {
	static blotName = "table-body";
	static tagName = "TBODY"
}
class TableContainer extends Container {
	static blotName = "table-container";
	static tagName = "TABLE";
	balanceCells() {
		const t = this.descendants(TableRow),
			e = t.reduce(((t, e) => Math.max(e.children.length, t)), 0);
			console.log("balanceCells")
		t.forEach((t => {
			new Array(e - t.children.length).fill(0).forEach((() => {
				let e;
				null != t.children.head && (e = TableCell.formats(t.children.head.domNode));
				const n = this.scroll.create(TableCell.blotName, e);
				t.appendChild(n), n.optimize()
			}))
		}))
	}
	cells(t) {
		console.log("cells")
		return this.rows().map((e => e.children.at(t)))
	}
	deleteColumn(t) {
		const [e] = this.descendant(TableBody);
		null != e && null != e.children.head && e.children.forEach((e => {
			const n = e.children.at(t);
			null != n && n.remove()
		}))
	}
	insertColumn(t) {
		console.log("insertColumn")
		const [e] = this.descendant(TableBody);
		null != e && null != e.children.head && e.children.forEach((e => {
			const n = e.children.at(t),
				r = TableCell.formats(e.children.head.domNode),
				i = this.scroll.create(TableCell.blotName, r);
			e.insertBefore(i, n)
		}))
	}
	insertRow(t) {
		console.log("insertRow")
		const [e] = this.descendant(TableBody);
		if (null == e || null == e.children.head) return;
		const n = nt(),
			r = this.scroll.create(TableRow.blotName);
		e.children.head.children.forEach((() => {
			const t = this.scroll.create(TableCell.blotName, n);
			r.appendChild(t)
		}));
		const i = e.children.at(t);
		e.insertBefore(r, i)
	}
	rows() {
		const t = this.children.head;
		console.log("rows")
		return null == t ? [] : t.children.map((t => t))
	}
}

function nt() {
	return `row-${Math.random().toString(36).slice(2,6)}`
}


Quill.register(TableCell);
Quill.register(TableRow);
Quill.register(TableBody);
Quill.register(TableContainer);