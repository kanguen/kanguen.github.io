"use strict";

window.addEventListener(
	'load',
	function () {
		navigation();
		currentPage();
	}, false
);

const CHILD_PAGES = {
	"adventure.html": "adventures.html"
};

function currentPage () {
	let currentPage = window.location.pathname;
	currentPage = currentPage.substr(currentPage.lastIndexOf('/') + 1);

	if (!currentPage) currentPage = "index.html";
	if (CHILD_PAGES[currentPage]) currentPage = CHILD_PAGES[currentPage];

	if (currentPage.toLowerCase() === "book.html") {
		const hashPart = window.location.hash.split(",")[0];
		if (hashPart) {
			currentPage += hashPart.toLowerCase();
		}
	}

	const current = $(`li[data-page="${currentPage}"]`);
	current.addClass("active");
	current.siblings().removeClass("active");
	current.parent().closest("li").addClass("active");
}

function navigation () {
	LI('navbar', 'index.html', 'Anasayfa');
	LI('navbar', 'quickreference.html', 'Oynanış ve Kurallar')

	LIDropdown('navbar', 'players', 'dropdown');
	A('players', 'playerOption', 'dropdown-toggle', 'dropdown', '#', 'button', 'true', 'false', "Oyuncu Seçenekleri <span class='caret'></span>");
	UL('players', 'ul_players', 'dropdown-menu');
	LI('ul_players', 'classes.html', 'Sınıflar');
	LI('ul_players', 'spells.html', 'Büyüler');
	LI('ul_players', 'races.html', 'Irklar');
	LI('ul_players', 'backgrounds.html', 'Karakter Geçmişleri');
	LI('ul_players', 'feats.html', 'Hünerler');
	LI('ul_players', 'items.html', 'Eşyalar');
	//LI('ul_players', 'invocations.html', 'Yakarışlar');
	//LI('ul_players', 'lifegen.html', 'Hayatın Bu');
	LI('ul_players', 'names.html', 'İsimler');
	LI('ul_players', 'conditions.html', 'Durumlar');

	//LIDropdown('navbar', 'references', 'dropdown');
	//A('references', 'references', 'dropdown-toggle', 'dropdown', '#', 'button', 'true', 'false', "Referanslar <span class='caret'></span>");
	//UL('references', 'ul_references', 'dropdown-menu');
	//LI('ul_references', 'bestiary.html', 'Yaratık Ansiklopedisi');
	//LI('ul_references', 'deities.html', 'Tanrılar');
	//LI('ul_references', 'items.html', 'Eşyalar');
	//LI('ul_references', 'rewards.html', 'Diğer Ödüller');
	//LI('ul_references', 'psionics.html', 'Psionikler');
//
	LI('navbar', 'statgen.html', 'Statgen');

	/*LIDropdown('navbar', 'utils', 'dropdown');
	A('utils', 'utils', 'dropdown-toggle', 'dropdown', '#', 'button', 'true', 'false', "Yardımcı Uygulamalar <span class='caret'></span>");
	UL('utils', 'ul_utils', 'dropdown-menu');
	LI('ul_utils', 'blacklist.html', 'İçerik Karalistesi');
	LI('ul_utils', 'converter.html', 'Stat Block to JSON');
	LI('ul_utils', 'demo.html', 'Renderer Demo');
	LI('ul_utils', 'roll20.html', 'Roll20 Script Help');*/

	LISwitcher('navbar', 'daynightMode', 'nightModeToggle', '#', 'styleSwitcher.toggleActiveStyleSheet(); return false;');

	/**
	 * Adds a link for the LIDropdowns
	 * @param {String} append_to_id - Which ID does this link belong too .
	 * @param {String} _id - What ID should this link have.
	 * @param {String} _class - What class(es) should this link have.
	 * @param {String} _datatoggle - What type of datatoggle.
	 * @param {String} _href - Where does this link to.
	 * @param {String} _role - Specific role.
	 * @param {String} _ariahaspop - Aria has pop.
	 * @param {String} _ariaexpanded - Default state.
	 * @param {String} _text - Text of the link.
	 */
	function A (append_to_id, _id, _class, _datatoggle, _href, _role, _ariahaspop, _ariaexpanded, _text) {
		const a = document.createElement('a');
		a.id = _id;
		a.className = _class;
		a.setAttribute('data-toggle', _datatoggle);
		a.href = _href;
		a.setAttribute('role', _role);
		a.setAttribute('aria-haspopup', _ariahaspop);
		a.setAttribute('aria-expanded', _ariaexpanded);
		a.innerHTML = _text;

		const appendTo = document.getElementById(append_to_id);
		appendTo.appendChild(a);
	}

	/**
	 * Adds a new list to the navigation bar
	 * @param {String} append_to_id - Which ID does this link belong too .
	 * @param {String} ul_id - What ID should this UL have.
	 * @param {String} _class - What class(es) should this link have.
	 */
	function UL (append_to_id, ul_id, _class) {
		const ul = document.createElement('ul');
		ul.id = ul_id;
		ul.className = _class;

		const appendTo = document.getElementById(append_to_id);
		appendTo.appendChild(ul);
	}

	/**
	 * Adds a new item to the navigation bar. Can be used either in root, or in a different UL.
	 * @param append_to_id - Which ID does this link belong too .
	 * @param a_href - Where does this link to.
	 * @param a_text - What text does this link have.
	 * @param a_hash - Optional hash to be appended to the base href
	 */
	function LI (append_to_id, a_href, a_text, a_hash) {
		const hashPart = a_hash ? `#${a_hash}`.toLowerCase() : "";
		$(`#${append_to_id}`)
			.append(`
				<li role="presentation" id="${a_text.toLowerCase().replace(/\s+/g, '')}" data-page="${a_href}${hashPart}">
					<a href="${a_href}${hashPart}">${a_text}</a>
				</li>
			`);
	}

	function LIDivider (append_to_id) {
		$(`#${append_to_id}`).append(`<li role="presentation" class="divider"></li>`);
	}

	/**
	 * Adds a new outbound item to the navigation bar. Can be used either in root, or in a different UL.
	 * @param {String} append_to_id - Which ID does this link belong too .
	 * @param {String} a_href - Where does this link to.
	 * @param {String} a_text - What text does this link have.
	 * @param {String} a_target - Where does this link target too.
	 * @param {String} a_title - What subtext does this link have.
	 */
	function LISpecial (append_to_id, a_href, a_text, a_target, a_title) {
		const $li = `
			<li role="presentation">
				<a href="${a_href}" target="${a_target}" title="${a_title}" class="dropdown-ext-link">
					<span>${a_text}</span>
					<span class="glyphicon glyphicon-log-out"></span>
				</a>
			</li>
		`;

		const $appendTo = $(`#${append_to_id}`);
		$appendTo.append($li);
	}

	/**
	 * Adds a new dropdown starting list to the navigation bar
	 * @param {String} append_to_id - Which ID does this link belong too .
	 * @param {String} li_id - What ID should this LI have.
	 * @param {String} _class - What class(es) should this LI have.
	 */
	function LIDropdown (append_to_id, li_id, _class) {
		const li = document.createElement('li');
		li.id = li_id;
		li.setAttribute('role', 'presentation');
		li.className = _class;

		const appendTo = document.getElementById(append_to_id);
		appendTo.appendChild(li);
	}

	/**
	 * Special LI for the Day/Night Switcher
	 * @param {String} append_to_id - Which ID does this link belong too .
	 * @param {String} li_id - What ID should this LI have.
	 * @param {String} a_class - What class(es) should this link have.
	 * @param {String} a_href - Where does this link to.
	 * @param {String} a_class - What should the link do when you click on it.
	 */
	function LISwitcher (append_to_id, li_id, a_class, a_href, a_onclick) {
		const a = document.createElement('a');
		a.href = a_href;
		a.className = a_class;
		a.setAttribute('onclick', a_onclick);
		a.innerHTML = styleSwitcher.getActiveStyleSheet() === StyleSwitcher.STYLE_DAY ? "Gece Modu" : "Gün Modu";

		const li = document.createElement('li');
		li.id = li_id;
		li.setAttribute('role', 'presentation');
		li.appendChild(a);

		const appendTo = document.getElementById(append_to_id);
		appendTo.appendChild(li);
	}
}
