import { Note, Notepad, Section } from './index';
import { format, parse } from 'date-fns';

export type FlatNotepadOptions = {
	lastModified?: Date;
	notepadAssets?: string[];
	sections?: { [internalRef: string]: FlatSection };
	notes?: { [internalRef: string]: Note };
};

export type FlatSection = {
	title: string;
	internalRef: string;
	parentRef?: string;
};

export default class FlatNotepad {
	public readonly lastModified: string;
	public readonly sections: { [internalRef: string]: FlatSection };
	public readonly notes: { [internalRef: string]: Note };
	public readonly notepadAssets: string[];

	constructor(
		public readonly title: string,
		opts: FlatNotepadOptions = {}
	) {
		this.lastModified = format(opts.lastModified || new Date(), 'YYYY-MM-DDTHH:mm:ss.SSSZ');
		this.sections = opts.sections || {};
		this.notes = opts.notes || {};
		this.notepadAssets = opts.notepadAssets || [];
	}

	public addSection(section: FlatSection): FlatNotepad {
		return this.clone({
			sections: {
				...this.sections,
				[section.internalRef]: section
			}
		});
	}

	public addNote(note: Note): FlatNotepad {
		// Ensure our parent is just a string for the section's internalRef, not the whole Parent object
		if (typeof note.parent !== 'string') note.parent = (note.parent as Section).internalRef;

		return this.clone({
			notes: {
				...this.notes,
				[note.internalRef]: note
			}
		});
	}

	public addAsset(uuid: string): FlatNotepad {
		return this.clone({
			notepadAssets: [
				...this.notepadAssets,
				uuid
			]
		});
	}

	public modified(lastModified: Date = new Date()): FlatNotepad {
		return this.clone({
			lastModified
		});
	}

	public search(query: string): Note[] {
		return Object.values(this.notes).filter(n => n.search(query).length > 0);
	}

	public toNotepad(): Notepad {
		const buildSection = (flat: FlatSection): Section => {
			let section = new Section(flat.title, [], [], flat.internalRef);

			// Restore sub-sections
			Object.values(this.sections)
				.filter(s => s.parentRef === flat.internalRef)
				.map(s => section = section.addSection(buildSection(s)));

			// Restore notes
			Object.values(this.notes)
				.filter(n => n.parent === flat.internalRef)
				.map(n => section = section.addNote(n));

			return section;
		};

		let notepad = new Notepad(this.title, {
			lastModified: parse(this.lastModified),
			notepadAssets: this.notepadAssets
		});

		// Add all the sections + notes
		Object.values(this.sections)
			.filter(s => !s.parentRef)
			.forEach(s => notepad = notepad.addSection(buildSection(s)));

		return notepad;
	}

	public clone(opts: Partial<FlatNotepadOptions> = {}, title: string = this.title): FlatNotepad {
		return new FlatNotepad(title, {
			lastModified: parse(this.lastModified),
			sections: this.sections,
			notes: this.notes,
			notepadAssets: this.notepadAssets,
			...opts
		});
	}
}