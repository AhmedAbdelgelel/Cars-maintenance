class ApiFeatures {
  constructor(query, queryString, searchFields = []) {
    this.query = query;
    this.queryString = queryString;
    this.searchFields = searchFields;
  }

  search() {
    const { search } = this.queryString;

    if (search && this.searchFields.length > 0) {
      const regex = new RegExp(search, "i");
      const searchQuery = {
        $or: this.searchFields.map((field) => ({
          [field]: regex,
        })),
      };

      this.query = this.query.where(searchQuery);
    }

    return this;
  }
}

module.exports = ApiFeatures;
