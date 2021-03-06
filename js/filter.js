"use strict";

/**
 * The API is as follows:
 * - render()
 * - getValues()
 * - addEventListener(type, listener, useCapture)
 * - reset()
 * - deselectIf(func, Filter.header)
 *
 * See the docs for each function for full explanations.
 */
class FilterBox {
	static getSelectedSources () {
		const parsed = StorageUtil.getForPage(FilterBox._STORAGE_NAME);
		if (parsed) {
			const sources = parsed[FilterBox.SOURCE_HEADER];
			if (sources) {
				const totals = sources._totals;
				delete sources._totals;
				if (totals.yes || totals.no) {
					if (totals.yes) {
						// if any are green, return only these
						return Object.keys(sources).filter(k => sources[k] === 1)
					}
					if (totals.no) {
						// otherwise, if we have any white, return these
						return Object.keys(sources).filter(k => sources[k] !== -1)
					}
				} else {
					// need to load all sources
					return Object.keys(sources);
				}
				return null;
			} else {
				return null;
			}
		}
		return null;
	}

	/**
	 * A FilterBox which sits in the search bar. See the Spells or Psionics page for a live example. Allows selection
	 * of multiple sources/spell schools/item types/etc.
	 *
	 * @param inputGroup the search bar DOM element to add the button to
	 * @param resetButton element to bind a reset-on-click to
	 * @param filterList a list of `Filter` objects to build the menus from
	 */
	constructor (inputGroup, resetButton, filterList) {
		this.inputGroup = inputGroup;
		this.resetButton = resetButton;
		this.filterList = filterList;

		this.headers = {};
		this.$disabledOverlay = $(`<div class="list-disabled-overlay"/>`);

		// clean legacy cookies
		// TODO remove this somewhere down the line
		Cookies.remove(FilterBox._STORAGE_NAME);
		Cookies.remove(FilterBox._STORAGE_NAME, {path: window.location.pathname});
		// end clean legacy cookies

		this.storedValues = StorageUtil.getForPage(FilterBox._STORAGE_NAME);
		this.$rendered = [];
		this.dropdownVisible = false;
		this.modeAndOr = "AND";
		this.$txtCount = $(`<span style="margin-left: auto"/>`);
	}

	/**
	 * Render the "Filters" button in the inputGroup
	 */
	render () {
		const firstRender = this.$rendered.length === 0;
		// save the current values to re-apply if we're re-rendering
		const curValues = firstRender ? null : this.getValues();
		// remove any previously rendered elements
		this._wipeRendered();

		this.$list = $(`#listcontainer`).find(`.list`);

		const $filterButton = getFilterButton();
		this.$miniView = getMiniView();
		const $inputGroup = $(this.inputGroup);

		const $outer = makeOuterList();
		const self = this;
		const $hdrLine = $(`<li class="filter-item"/>`);
		const $hdrLineInner = $(`<div class="h-wrap"/>`).appendTo($hdrLine);
		if (this.filterList.length > 1) {
			const $btnAndOr = $(`<button class="btn btn-default btn-xs" style="width: 3em;">${this.modeAndOr}</button>`)
				.data("andor", this.modeAndOr)
				.on(EVNT_CLICK, () => {
					const nxt = $btnAndOr.data("andor") === "OR" ? "AND" : "OR";
					self.modeAndOr = nxt;
					$btnAndOr.text(nxt);
					$btnAndOr.data("andor", nxt);
				});
			$hdrLineInner.append(`Combine filters as... `).append(`<div style="display: inline-block; width: 10px;"/>`).append($btnAndOr);
		}
		$hdrLineInner.append(this.$txtCount);
		if (!this.filterList[0].minimalUI) $outer.append($hdrLine).append(makeDivider());
		for (let i = 0; i < this.filterList.length; ++i) {
			$outer.append(makeOuterItem(this, this.filterList[i], this.$miniView));
			if (i < this.filterList.length - 1) $outer.append(makeDivider());
		}
		$inputGroup.prepend($filterButton);
		this.$rendered.push($filterButton);
		$inputGroup.append($outer);
		this.$rendered.push($outer);
		$inputGroup.after(this.$miniView);
		this.$rendered.push(this.$miniView);

		addShowHideHandlers(this);
		if (firstRender) {
			addResetHandler(this);
			addSaveHandler(this);
		}

		if (this.dropdownVisible) {
			$filterButton.find("button").click();
		}

		function getFilterButton () {
			const $buttonWrapper = $(`<div id="filter-toggle-btn"/>`);
			$buttonWrapper.addClass(FilterBox.CLS_INPUT_GROUP_BUTTON);

			const $filterButton = $(`<button class="btn btn-default dropdown-toggle" data-toggle="dropdown">Filtre <span class="caret"></span></button>`);
			$buttonWrapper.append($filterButton);
			return $buttonWrapper;
		}

		function getMiniView () {
			return $(`<div class="mini-view btn-group"/>`);
		}

		function makeOuterList () {
			const $outL = $("<ul/>");
			$outL.addClass(FilterBox.CLS_DROPDOWN_MENU);
			$outL.addClass(FilterBox.CLS_DROPDOWN_MENU_FILTER);
			return $outL;
		}

		function makeOuterItem (self, filter, $miniView, namePrefix) {
			if (filter instanceof MultiFilter) {
				const $parent = $(`<div/>`);
				for (const child of filter.filters) {
					const $ch = makeOuterItem(self, child, $miniView, filter.categoryName);
					$parent.append($ch);
				}
				return $parent;
			} else if (filter instanceof RangeFilter) {
				// TODO
			} else if (filter instanceof AllSourcesFilter) {
				// TODO
			} else {
				const $outI = $("<li/>");
				$outI.addClass("filter-item");

				self.headers[filter.header] = {outer: $outI, filter: filter};
				const $grid = makePillGrid(filter.header);
				self.headers[filter.header].ele = $grid;
				const $innerListHeader = makeHeaderLine($grid);

				$outI.append($innerListHeader);
				$outI.append($grid);

				return $outI;
			}

			function makeHeaderLine ($grid) {
				const minimalClass = filter.minimalUI ? "filter-minimal" : "";
				const $line = $(`<div class="h-wrap ${minimalClass}"/>`);
				const $label = $(`<div>${namePrefix ? `<span class="text-muted">${namePrefix}: </span>` : ""}${filter.header}</div>`);
				$line.append($label);

				function makeAndOrBtn (defState, tooltip) {
					const $btn = $(` <button class="btn btn-default btn-xs ${minimalClass}" style="width: 3em;" title="${tooltip}">${defState}</button>`)
						.data("andor", defState);
					return $btn
						.on(EVNT_CLICK, () => {
							const nxt = $btn.data("andor") === "OR" ? "AND" : "OR";
							$btn.data("andor", nxt);
							$btn.text(nxt);
						});
				}

				const $btnAndOrBlue = makeAndOrBtn("OR", "Positive matches mode for this filter. AND requires all blues to match, OR requires at least one blue to match.");
				self.headers[filter.header].getAndOrBlue = () => {
					return $btnAndOrBlue.data("andor");
				};
				const $btnAndOrRed = makeAndOrBtn("OR", "Negative match mode for this filter. AND requires all reds to match, OR requires at least one red to match.");
				self.headers[filter.header].getAndOrRed = () => {
					return $btnAndOrRed.data("andor");
				};

				const $quickBtns = $(`<span class="btn-group quick-btns" style="margin-left: auto;"/>`);
				const $all = $(`<button class="btn btn-default btn-xs ${minimalClass}">Hepsi</button>`);
				$quickBtns.append($all);
				const $clear = $(`<button class="btn btn-default btn-xs ${minimalClass}">Temizle</button>`);
				$quickBtns.append($clear);
				const $none = $(`<button class="btn btn-default btn-xs ${minimalClass}">Hiçbiri</button>`);
				$quickBtns.append($none);
				const $default = $(`<button class="btn btn-default btn-xs ${minimalClass}">Varsayılan</button>`);
				$quickBtns.append($default);
				$line.append($quickBtns);

				const $logicBtns = $(`<span class="btn-group andor-btns"></span>`);
				$logicBtns.append($btnAndOrBlue).append($btnAndOrRed);
				$line.append(`<div style="display: inline-block; width: 5px;">`).append($logicBtns);

				const $summary = $(`<span class="summary" style="margin-left: auto;"/>`);
				const $summaryInclude = $(`<span class="include" title="Hiding includes"/>`);
				const $summarySpacer = $(`<span class="spacer"/>`);
				const $summaryExclude = $(`<span class="exclude" title="Hidden excludes"/>`);
				$summary.append($summaryInclude);
				$summary.append($summarySpacer);
				$summary.append($summaryExclude);
				$summary.hide();
				$line.append($summary);

				const $showHide = $(`<button class="btn btn-default btn-xs show-hide-button ${minimalClass}" style="margin-left: 12px;">Gizle</button>`);
				$line.append($showHide);

				$showHide.on(EVNT_CLICK, function () {
					if ($grid.is(":hidden")) {
						$showHide.text("Hide");
						$grid.show();
						$quickBtns.show();
						$summary.hide();
						$showHide.css("margin-left", "12px");
					} else {
						$showHide.text("Show");
						$grid.hide();
						$quickBtns.hide();
						const counts = $grid.data("getCounts")();
						if (counts.yes > 0 || counts.no > 0) {
							if (counts.yes > 0) {
								$summaryInclude.prop("title", `${counts.yes} hidden 'required' tag${counts.yes > 1 ? "s" : ""}`);
								$summaryInclude.text(counts.yes);
								$summaryInclude.show();
							} else {
								$summaryInclude.hide();
							}
							if (counts.yes > 0 && counts.no > 0) {
								$summarySpacer.show();
							} else {
								$summarySpacer.hide();
							}
							if (counts.no > 0) {
								$summaryExclude.prop("title", `${counts.no} hidden 'excluded' tag${counts.no > 1 ? "s" : ""}`);
								$summaryExclude.text(counts.no);
								$summaryExclude.show();
							} else {
								$summaryExclude.hide();
							}
							$showHide.css("margin-left", "12px");
							$summary.show();
						} else {
							$showHide.css("margin-left", "auto");
						}
					}
				});

				$none.on(EVNT_CLICK, function () {
					$grid.find(".filter-pill").each(function () {
						$(this).data("setter")(FilterBox._PILL_STATES[2]);
					});
				});

				$all.on(EVNT_CLICK, function () {
					$grid.find(".filter-pill").each(function () {
						$(this).data("setter")(FilterBox._PILL_STATES[1]);
					});
				});

				$clear.on(EVNT_CLICK, function () {
					$grid.find(".filter-pill").each(function () {
						$(this).data("setter")(FilterBox._PILL_STATES[0]);
					});
				});

				$default.on(EVNT_CLICK, function () {
					self._reset(filter.header);
				});

				return $line;
			}

			function makePillGrid () {
				const $pills = [];
				const $grid = $(`<div class="pill-grid"/>`);

				function cycleState ($pill, $miniPill, forward) {
					const curIndex = FilterBox._PILL_STATES.indexOf($pill.attr("state"));

					let newIndex = forward ? curIndex + 1 : curIndex - 1;
					if (newIndex >= FilterBox._PILL_STATES.length) newIndex = 0;
					else if (newIndex < 0) newIndex = FilterBox._PILL_STATES.length - 1;
					$pill.attr("state", FilterBox._PILL_STATES[newIndex]);
					$miniPill.attr("state", FilterBox._PILL_STATES[newIndex]);
				}

				for (const item of filter.items) {
					const iText = item instanceof FilterItem ? item.item : item;
					const iChangeFn = item instanceof FilterItem ? item.changeFn : null;

					const $pill = $(`<div class="filter-pill"/>`);
					const $miniPill = $(`<div class="mini-pill"/>`);

					const display = filter.displayFn ? filter.displayFn(iText) : iText;

					$pill.val(iText);
					$pill.html(display);
					$miniPill.html(display);

					$pill.attr("state", FilterBox._PILL_STATES[0]);
					$miniPill.attr("state", FilterBox._PILL_STATES[0]);

					$miniPill.on(EVNT_CLICK, function () {
						$pill.attr("state", FilterBox._PILL_STATES[0]);
						$miniPill.attr("state", FilterBox._PILL_STATES[0]);
						handlePillChange(iText, iChangeFn, FilterBox._PILL_STATES[0]);
						self._fireValChangeEvent();
					});

					$pill.on(EVNT_CLICK, function () {
						cycleState($pill, $miniPill, true);
						handlePillChange(iText, iChangeFn, $pill.attr("state"));
					});

					$pill.on("contextmenu", function (e) {
						e.preventDefault();
						cycleState($pill, $miniPill, false);
						handlePillChange(iText, iChangeFn, $pill.attr("state"));
					});

					// bind getters and resetters
					$pill.data(
						"setter",
						function (toVal) {
							_setter($pill, $miniPill, toVal, iText, iChangeFn, false);
						}
					);
					$pill.data("resetter",
						function () {
							_resetter($pill, $miniPill, iText, iChangeFn, false);
						}
					);

					// If re-render, use previous values. Otherwise, if there's stored values, stored values. Otherwise, default the pills
					if (curValues) {
						let valNum = curValues[filter.header][iText];
						if (valNum < 0) valNum = 2;
						_setter($pill, $miniPill, FilterBox._PILL_STATES[valNum], iText, iChangeFn, true);
					} else if (self.storedValues && self.storedValues[filter.header] && self.storedValues[filter.header][iText] !== undefined) {
						let valNum = self.storedValues[filter.header][iText];
						if (valNum < 0) valNum = 2;
						_setter($pill, $miniPill, FilterBox._PILL_STATES[valNum], iText, iChangeFn, true);
					} else {
						_resetter($pill, $miniPill, iText, iChangeFn, true);
					}

					// add a class to mark any items that are default deselected (used to add visual difference)
					tagDefaults($miniPill, iText);

					$grid.append($pill);
					$miniView.append($miniPill);
					$pills.push($pill);
				}

				function tagDefaults ($miniPill, iText) {
					if (filter.deselFn && filter.deselFn(iText)) {
						$miniPill.addClass("default-desel");
					} else if (filter.selFn && filter.selFn(iText)) {
						$miniPill.addClass("default-sel");
					}
				}

				// allows silent (pill change function not triggered) sets
				function _setter ($pill, $miniPill, toVal, iText, iChangeFn, silent) {
					$pill.attr("state", toVal);
					$miniPill.attr("state", toVal);
					if (!silent) {
						handlePillChange(iText, iChangeFn, toVal);
					}
				}

				// allows silent (pill change function not triggered) resets
				function _resetter ($pill, $miniPill, iText, iChangeFn, silent) {
					if (filter.deselFn && filter.deselFn(iText)) {
						$pill.attr("state", "no");
						$miniPill.attr("state", "no");
					} else if (filter.selFn && filter.selFn(iText)) {
						$pill.attr("state", "yes");
						$miniPill.attr("state", "yes");
					} else {
						$pill.attr("state", "ignore");
						$miniPill.attr("state", "ignore");
					}
					if (!silent) {
						handlePillChange(iText, iChangeFn, $pill.attr("state"));
					}
				}

				function handlePillChange (iText, iChangeFn, val) {
					if (iChangeFn) {
						iChangeFn(iText, val);
					}
				}

				$grid.data(
					"getValues",
					function () {
						const out = {};
						const _totals = {yes: 0, no: 0, ignored: 0};
						$pills.forEach(function (p) {
							const state = p.attr("state");
							out[p.val()] = state === "yes" ? 1 : state === "no" ? -1 : 0;
							const countName = state === "yes" ? "yes" : state === "no" ? "no" : "ignored";
							_totals[countName] = _totals[countName] + 1;
						});
						out._totals = _totals;
						out._andOr = {
							blue: self.headers[filter.header].getAndOrBlue(),
							red: self.headers[filter.header].getAndOrRed()
						};
						return out;
					}
				);

				$grid.data(
					"setValues",
					function (toVal) {
						const toNo = toVal.filter(it => it[0] === "!").map(it => it.slice(1));
						const toYes = toVal.filter(it => it[0] !== "!");
						$pills.forEach((p) => {
							if (toYes.includes(p.val().toLowerCase())) {
								$(p).data("setter")(FilterBox._PILL_STATES[1])
							} else if (toNo.includes(p.val().toLowerCase())) {
								$(p).data("setter")(FilterBox._PILL_STATES[2])
							} else {
								$(p).data("setter")(FilterBox._PILL_STATES[0])
							}
						});
					}
				);

				$grid.data(
					"getCounts",
					function () {
						const out = {"yes": 0, "no": 0};
						$pills.forEach(function (p) {
							const state = p.attr("state");
							if (out[state] !== undefined) out[state] = out[state] + 1;
						});
						return out;
					}
				);

				return $grid;
			}
		}

		function makeDivider () {
			return $(`<div class="pill-grid-divider"/>`);
		}

		function addShowHideHandlers (self) {
			// watch for the button changing to "open"
			const $filterToggleButton = $("#filter-toggle-btn");
			const observer = new MutationObserver(function (mutations) {
				mutations.forEach(function (mutationRecord) {
					if (!$filterToggleButton.hasClass("open")) {
						self.$disabledOverlay.detach();
						self.dropdownVisible = false;
						$outer.hide();
						// fire an event when the form is closed
						self._fireValChangeEvent();
					} else {
						self.$list.parent().append(self.$disabledOverlay);
						$outer.show();
						self.dropdownVisible = true;
					}
				});
			});
			observer.observe($filterToggleButton[0], {attributes: true, attributeFilter: ["class"]});

			// squash events from the menu, otherwise the dropdown gets hidden when we click inside it
			$outer.on(EVNT_CLICK, function (e) {
				e.stopPropagation();
			});
		}

		function addResetHandler (self) {
			if (self.resetButton !== null && self.resetButton !== undefined) {
				self.resetButton.addEventListener(EVNT_CLICK, function () {
					self.reset();
				}, false);
			}
		}

		function addSaveHandler (self) {
			window.addEventListener("beforeunload", function () {
				const state = self.getValues();
				StorageUtil.setForPage(FilterBox._STORAGE_NAME, state);
			});
		}
	}

	/**
	 * Get a map of {Filter.header: {map of Filter.items: <1/0/-1> representing the state
	 * to each pill}}
	 * Additionally, include an element per filter which gives the total of 1/0/-1 entries
	 * Note that 1 represents a "required" pill, 0 represents an "ignored" pill, and -1 respresents an "excluded"
	 * pill.
	 *
	 * @returns the map described above e.g.
	 *
	 * {
	 *  "Source": { "PHB": 1, "DMG": 0, "_totals": { "yes": 1, "no": 0, "ignored": 1 }, "_andOr": { "blue": "OR", "red": "AND" } },
	 *  "School": { "A": 0, "EV": -1, "_totals": { "yes": 0, "no": 1, "ignored": 1 }, "_andOr": { "blue": "AND", "red": "OR" } }
     * }
	 *
	 */
	getValues () {
		const outObj = {};
		for (const header in this.headers) {
			if (!this.headers.hasOwnProperty(header)) continue;
			outObj[header] = this.headers[header].ele.data("getValues")();
		}
		return outObj;
	}

	/**
	 * Convenience function to cleanly add event listeners
	 *
	 * @param type should probably always be `FilterBox.EVNT_VALCHANGE` which is fired when the values available
	 * from getValues() change
	 *
	 * @param listener A function to call when the event is fired. See JS addEventListener docs for more.
	 * @param useCapture See JS addEventListener docs.
	 */
	addEventListener (type, listener, useCapture) {
		this.inputGroup.addEventListener(type, listener, useCapture)
	}

	/**
	 * Reset the selected filters to default, applying any `selFn` and `deselFn` functions from the filters
	 */
	reset () {
		for (const header in this.headers) {
			if (!this.headers.hasOwnProperty(header)) continue;
			this._reset(header);
		}
		this._fireValChangeEvent();
	}

	setFromSubHashes (subHashes) {
		const unpacked = {};
		subHashes.forEach(s => Object.assign(unpacked, UrlUtil.unpackSubHash(s, true)));
		const toMatch = {};
		Object.keys(this.headers).forEach(hk => {
			toMatch[hk.toLowerCase()] = this.headers[hk];
		});
		const toRemove = [];
		Object.keys(unpacked)
			.filter(k => k.startsWith(FilterBox._SUB_HASH_PREFIX))
			.forEach(rawSubhash => {
				const header = rawSubhash.substring(6);

				if (toMatch[header]) {
					toRemove.push(rawSubhash);
					toMatch[header].ele.data("setValues")(unpacked[rawSubhash])
				} else {
					throw new Error(`Could not find filter with header ${header} for subhash ${rawSubhash}`)
				}
			});

		if (toRemove.length) {
			const [link, ...sub] = History._getHashParts();

			const outSub = [];
			Object.keys(unpacked)
				.filter(k => !toRemove.includes(k))
				.forEach(k => {
					outSub.push(`${k}${HASH_SUB_KV_SEP}${unpacked[k].join(HASH_SUB_LIST_SEP)}`)
				});

			History.setSuppressHistory(true);
			window.location.hash = `#${link}${outSub.length ? `${HASH_PART_SEP}${outSub.join(HASH_PART_SEP)}` : ""}`;
		}
	}

	setFromValues (values) {
		Object.keys(this.headers).forEach(hk => {
			if (values[hk]) {
				const cur = this.headers[hk];
				const toSet = values[hk];
				cur.ele.data("setValues")(toSet)
			}
		});
	}

	getAsSubHashes () {
		const cur = this.getValues();
		const out = {};

		Object.keys(cur).forEach(name => {
			const vals = cur[name];
			const outName = `${FilterBox._SUB_HASH_PREFIX}${name}`;

			if (vals._totals.yes || vals._totals.no) {
				out[outName] = [];
				Object.keys(vals).forEach(vK => {
					if (vK.startsWith("_")) return;
					const vV = vals[vK];
					if (!vV) return;
					out[outName].push(`${vV < 0 ? "!" : ""}${vK}`);
				});
			} else {
				out[outName] = [HASH_SUB_NONE];
			}
		});
		return out;
	}

	toDisplay (curr, ...vals) {
		const res = this.filterList.map((f, i) => {
			return f.isMulti ? f.toDisplay(curr, ...vals[i]) : f.toDisplay(curr, vals[i])
		});
		return this.modeAndOr === "AND" ? res.every(it => it) : res.find(it => it);
	}

	setCount (count, maxCount) {
		this.$txtCount.html(`Showing ${count}/${maxCount}`);
	}

	/**
	 * Helper which resets an section of the filter
	 * @param header the name of the section to reset
	 * @private
	 */
	_reset (header) {
		const cur = this.headers[header];
		cur.ele.find(".filter-pill").each(function () {
			$(this).data("resetter")();
		});
	}

	/**
	 * Helper which dispatched the event when the filter needs to fire a "changed" event
	 * @private
	 */
	_fireValChangeEvent () {
		const eventOut = new Event(FilterBox.EVNT_VALCHANGE);
		this.inputGroup.dispatchEvent(eventOut);
	}

	/**
	 * Clean up any previously rendered elements
	 * @private
	 */
	_wipeRendered () {
		this.$rendered.forEach($e => $e.remove());
		this.$rendered = [];
		this.$disabledOverlay.detach();
	}

	/**
	 * If the currently selected item is hidden, load the first visible item
	 * @param fromList the page data list
	 */
	static nextIfHidden (fromList) {
		if (History.lastLoadedId && !History.initialLoad) {
			const last = fromList[History.lastLoadedId];
			const lastHash = UrlUtil.autoEncodeHash(last);
			const link = $("#listcontainer").find(`.list a[href="#${lastHash.toLowerCase()}"]`);
			if (!link.length) History._freshLoad();
		}
	}
}

FilterBox.CLS_INPUT_GROUP_BUTTON = "input-group-btn";
FilterBox.CLS_DROPDOWN_MENU = "dropdown-menu";
FilterBox.CLS_DROPDOWN_MENU_FILTER = "dropdown-menu-filter";
FilterBox.EVNT_VALCHANGE = "valchange";
FilterBox.SOURCE_HEADER = "Source";
FilterBox._PILL_STATES = ["ignore", "yes", "no"];
FilterBox._STORAGE_NAME = "filterState";
FilterBox._SUB_HASH_PREFIX = "filter";

class Filter {
	/**
	 * A single filter category
	 *
	 * @param options an object with the following properties:
	 *
	 *   header: the category header e.g. "Source"
	 *
	 *   (OPTIONAL)
	 *   items: a list of items to display (after applying the displayFn) in the FilterBox once `render()`
	 *     has been called e.g. ["PHB", "DMG"]
	 *     Note that you can pass a pointer to a list, and add items afterwards. Or pass nothing, which is equivalent to
	 *     passing an empty list. The contents are only evaluated once `render()` is called.
	 *     The items themselves can be strings or `FilterItem`s.
	 *
	 *   (OPTIONAL)
	 *   displayFn: A function to apply to each item in items when displaying the FilterBox on the page
	 *     e.g. Parser.sourceJsonToFull
	 *
	 *   (OPTIONAL)
	 *   selFn: a function, defaults items as "match this" if `selFn(item)` is true
	 *
	 *   (OPTIONAL)
	 *   deselFn: a function, defaults items as "do not match this" if `deselFn(item)` is true
	 *
	 */
	constructor (options) {
		this.header = options.header;
		this.items = options.items ? options.items : [];
		this.displayFn = options.displayFn;
		this.selFn = options.selFn;
		this.deselFn = options.deselFn;
		this.attrName = options.attrName;
		this.minimalUI = options.minimalUI;
	}

	/**
	 * Add an item if it doesn't already exist in the filter
	 * @param item the item to add
	 */
	addIfAbsent (item) {
		if (!this.items.find(it => Filter._checkMatches(it, item))) this.items.push(item);
	}

	static _checkMatches (item1, item2) {
		return item1 instanceof FilterItem ? item1.item === (item2 instanceof FilterItem ? item2.item : item2) : item1 === (item2 instanceof FilterItem ? item2.item : item2)
	}

	/**
	 * Remove an item if it exists in the filter
	 * @param item the item to remove
	 */
	removeIfExists (item) {
		const ix = this.items.findIndex(it => Filter._checkMatches(it, item));
		if (~ix) this.items.splice(ix, 1);
	}

	/**
	 * Takes the output of `FilterBox.getValues()` and an item to check or array of items to check, and matches the
	 * filter against it/them.
	 *
	 * @param valObj `FilterBox.getValues()` returned object
	 * @param toCheck item or array of items to match against
	 * @returns {*} true if this item should be displayed, false otherwise
	 */
	toDisplay (valObj, toCheck) {
		// TODO handle AND/OR
		const map = valObj[this.header];
		const totals = map._totals;
		if (toCheck instanceof Array) {
			let hide = false;
			let display = false;

			if (map._andOr.blue === "OR") {
				// default to displaying
				if (totals.yes === 0) {
					display = true;
				}

				toCheck.forEach(tc => {
					if (map[tc] === 1) { // if any are 1 (nlue) include if they match
						display = true;
					}
				});
			} else {
				let ttlYes = 0;
				toCheck.forEach(tc => {
					if (map[tc] === 1) {
						ttlYes++;
					}
				});
				display = !totals.yes || totals.yes === ttlYes;
			}

			if (map._andOr.red === "OR") {
				toCheck.forEach(tc => {
					if (map[tc] === -1) { // if any are -1 (red) exclude if they match
						hide = true;
					}
				});
			} else {
				let ttlNo = 0;
				toCheck.forEach(tc => {
					if (map[tc] === -1) {
						ttlNo++;
					}
				});
				hide = totals.no && totals.no === ttlNo;
			}

			return display && !hide;
		} else {
			return doCheck();
		}

		function doCheck () {
			let display = false;
			let hide = false;
			if (map._andOr.blue === "OR") {
				if (totals.yes > 0) {
					display = map[toCheck] === 1;
				} else {
					display = true;
				}
			} else {
				if (totals.yes > 0) {
					display = map[toCheck] === 1 && totals.yes === 1;
				} else {
					display = true;
				}
			}

			if (map._andOr.red === "OR") {
				if (totals.no > 0) {
					hide = map[toCheck] === -1;
				}
			} else {
				hide = totals.no === 1 && map[toCheck] === -1;
			}

			return display && !hide;
		}
	}
}

class FilterItem {
	/**
	 * An alternative to string `Filter.items` with a change-handling function
	 * @param item string
	 * @param changeFn called when this item is clicked/etc; calls `changeFn(item)`
	 */
	constructor (item, changeFn) {
		this.item = item;
		this.changeFn = changeFn;
	}
}

class RangeFilter extends Filter {
	// TODO implement a filter displayed as a range of items on a slider
}

class AllSourcesFilter extends Filter {
	// TODO implement a filter with an "All Sources" button (toggled off by default)
}

class MultiFilter {
	/**
	 * A group of multiple `Filter`s, which are OR'd together
	 * @param categoryName a prefix to display before the filter headers
	 * @param filters the list of filters
	 */
	constructor (categoryName, ...filters) {
		this.categoryName = categoryName;
		this.filters = filters;
		this.isMulti = true;
	}

	/**
	 * For each `toChecks` tc, calls `Filter.toDisplay(valObj, tc)` and OR's the result, returning it. See the
	 * `Filter.toDisplay` docs.
	 * @param valObj `FilterBox.getValues()` returned object
	 * @param toChecks a list of objects to pass to the underlying filters, which must be the same length as the number
	 * of filters
	 * @returns {boolean} OR'd results of the underling `Filter.toDisplay` results
	 * @throws an error if the `toChecks` list did not match the length of `this.filters`
	 */
	toDisplay (valObj, ...toChecks) {
		if (this.filters.length !== toChecks.length) throw new Error("Number of filters and number of toChecks did not match");
		const results = [];
		for (let i = 0; i < this.filters.length; ++i) {
			const f = this.filters[i];
			// TODO use and/or flag?
			const totals = valObj[f.header]._totals;

			if (totals.yes === 0 && totals.no === 0) results.push(null);
			else {
				results.push(this.filters[i].toDisplay(valObj, toChecks[i]));
			}
		}
		const resultsFilt = results.filter(r => r !== null);
		if (!resultsFilt.length) return true;
		return resultsFilt.find(r => r);
	}
}

/**
 * An extremely simple deselect function. Simply deselects everything.
 * Useful for creating filter boxes where the default is "everything deselected"
 */
Filter.deselAll = function (val) {
	return true;
};