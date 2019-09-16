import validator from "validator";

export default fields => {
  function validateHelper(values, acc, item) {
    const result = acc;
    const key = item.name;
    const validation = item.validation.map(validCheck => {
      switch (validCheck) {
        case "required":
          if (!values[key]) return "Required";
          break;
        case "not_empty_array":
          if (Array.isArray(values[key]) && values[key].length === 0)
            return "Required";
          break;
        case "date":
          if (values[key] === "MM/DD/YYYY") return "Invalid date";
          break;
        case "number":
          if (!validator.isNumeric(`${values[key]}`)) return "Invalid number";
          break;
        case "email":
          if (!validator.isEmail(`${values[key]}`))
            return "Invalid email address";
          break;
        case "match_password":
          if (values.password !== values.confirm_password)
            return "Passwords do not match";
          break;
        default:
          break;
      }
      return null;
    });

    result[key] = validation ? validation.filter(n => n)[0] : null;
    return result;
  }

  return values =>
    fields.reduce((acc, item) => {
      let result = acc;
      if (Array.isArray(item)) {
        result = item.reduce(
          (res, it) => validateHelper(values, res, it),
          result
        );
        return result;
      }
      result = validateHelper(values, result, item);
      return result;
    }, {});
};
