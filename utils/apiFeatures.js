class ApiFeatures {
  constructor(query, queryString, searchFields = []) {
    this.query = query;
    this.queryString = queryString;
    this.searchFields = searchFields;
  }

  search() {
    const searchQuery = {};
    this.searchFields.forEach((field) => {
      if (this.queryString[field]) {
        searchQuery[field] = { $regex: this.queryString[field], $options: "i" };
      }
    });
    this.query = this.query.find(searchQuery);
    return this;
  }
}

module.exports = ApiFeatures;
