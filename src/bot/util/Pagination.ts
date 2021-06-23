export function paginate<T>(pages: T[], page = 1, pageLength = 1) {
	const maxPage = Math.ceil(pages.length / pageLength);
	if (page < 1) page = 1;
	if (page > maxPage) page = maxPage;
	const startIndex = (page - 1) * pageLength;
	const sliced = pages.length > pageLength
		? pages.slice(startIndex, startIndex + pageLength)
		: pages;

	return {
		pages: sliced, page, maxPage, pageLength,
		next() {
			page += 1;
			if (page < 1) page = this.maxPage;
			if (page > this.maxPage) page = 1;
			return { page: page, ended: page === this.maxPage, started: page === 1 };
		},
		previous() {
			page -= 1;
			if (page < 1) page = this.maxPage;
			if (page > this.maxPage) page = 1;
			return { page: page, started: page === 1, ended: page === this.maxPage };
		},
		first() {
			return this.pages[0];
		}
	};
}
