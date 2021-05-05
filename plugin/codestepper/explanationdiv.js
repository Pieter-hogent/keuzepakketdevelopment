export class Range {
	// will parse a string of the form "1,2,3-7,9-12,14"
	// and create an object with a 'range' key with [1,2,3,4,5,6,7,9,10,11,12,14] as an array of integers
	// and a 'forever' key, either true or false, denoting if all indices greater than the last are included
	// (constructed by +, e.g. "1-4,5,8+")
	constructor(stringRange) {
		this.range = [];
		// if the last char is a +, the range includes all indexes greater than the last one parsed
		this.forever = false;
		if (!stringRange) {
			return;
		}

		stringRange = stringRange.trim();
		if (stringRange.slice(-1) === '+') {
			this.forever = true;
			stringRange = stringRange.slice(0, -1);
		}
		if (stringRange.length) {
			stringRange.split(',').forEach((el) => {
				let dashRange = el.split('-');
				if (dashRange.length === 1) {
					this.range.push(parseInt(el));
				} else {
					let from = parseInt(dashRange[0]);
					let to = parseInt(dashRange[1]);
					if (to >= from) {
						for (let i = from; i <= to; ++i) {
							this.range.push(i);
						}
					} else {
						console.error(`range a-b with a > b "${from}-${to}"`);
					}
				}
			});
		}
	}

	max() {
		if (this.range.length === 0) return 0;
		return Math.max(...this.range);
	}

	firstIndex() {
		if (this.range.length === 0) return -1;
		return this.range[0];
	}

	lastIndex() {
		if (this.forever || this.range.length === 0) return -1;
		return this.range[this.range.length - 1];
	}

	includes(index) {
		return this.range.includes(index) || (this.forever && index > this.max());
	}

	merge(rhsRange) {
		this.forever = this.forever || rhsRange.forever;
		this.range = [...this.range, ...rhsRange.range]
			.sort()
			.filter(function (item, pos, ary) {
				return !pos || item != ary[pos - 1];
			}); // removes if equal to previous, i.e. removes duplicates because sorted
	}

	// returns true if the 'range' contains more than one number
	// (to clone less nodes if only used once)
	isUsedMoreThanOnce() {
		return this.range.length > 1;
	}

	*[Symbol.iterator]() {
		for (let i = 0; i < this.range.length; i++) {
			yield this.range[i];
		}
	}
}

/**
 * @returns	a Map<Range, explanation HTMLElement>, so for all indices in Range this explanation should be added
 * 					explanation is a clone of the original htmlelement, so feel free to add/remove as is convenient
 * @param {HTMLElement} explanationDiv
 */
export function parseCodeExplanations(explanationDiv) {
	let codeExplanations = new Map();

	let explanationNodes = explanationDiv.querySelectorAll('span[step]');
	explanationNodes.forEach((explanationNode) => {
		const explanationRange = new Range(explanationNode.getAttribute('step'));
		let explanation = document.createElement('div');
		explanation.classList.add('code-explanation');
		// copy style, so we can override default behaviour in our slides
		// (e.g. greater width or whatever)
		if (explanationNode.hasAttribute('style')) {
			explanation.setAttribute('style', explanationNode.getAttribute('style'));
		}
		if (
			explanationNode.childNodes.length > 1 ||
			(explanationNode.childNodes[0] &&
				explanationNode.childNodes[0].nodeType === 1)
		) {
			explanationNode.childNodes.forEach((n) =>
				explanation.appendChild(n.cloneNode(true))
			);
		} else if (explanationNode.childNodes[0]) {
			explanation.appendChild(explanationNode.childNodes[0].cloneNode(true));
		}
		codeExplanations.set(explanationRange, explanation);
	});

	return codeExplanations;
}

/**
 *
 * @param {number} idx
 * @param {Map<Range, node>} explanationMap as created by the previous function
 * @returns a HTMLElement (div), with all relevant explanationdiv's for index idx, or null if there aren't any
 */
export function createExplanationDivForIndex(idx, explanationMap) {
	let gotExplanation = false;
	let explDiv = document.createElement('div');
	explDiv.classList.add('explanations');
	explanationMap.forEach((explanations, range) => {
		if (range.includes(idx)) {
			if (range.isUsedMoreThanOnce()) {
				explDiv.appendChild(explanations.cloneNode(true));
			} else {
				explDiv.appendChild(explanations);
			}
			gotExplanation = true;
		}
	});
	return gotExplanation ? explDiv : null;
}
