import { formatItemError, isAbsoluteUrl, isDateString, isPlainObject } from './lib.mjs';

export function validateSchemaForItems(allItems, schema, schemaErrors) {
  for (const { item, location } of allItems) {
    validateSchema(item, schema, '$', schemaErrors, location);
  }
}

function validateSchema(value, schema, valuePath, errors, location) {
  const localErrors = [];
  collectSchemaErrors(value, schema, valuePath, localErrors);
  for (const error of localErrors) {
    errors.push(formatItemError(location, error));
  }
}

function collectSchemaErrors(value, schema, valuePath, errors) {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  if (Array.isArray(schema.allOf)) {
    for (const nestedSchema of schema.allOf) {
      collectSchemaErrors(value, nestedSchema, valuePath, errors);
    }
  }

  if (schema.if && schema.then && matchesSchema(value, schema.if)) {
    collectSchemaErrors(value, schema.then, valuePath, errors);
  }

  if (schema.const !== undefined && !Object.is(value, schema.const)) {
    errors.push(`${valuePath} must equal ${JSON.stringify(schema.const)}`);
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => Object.is(candidate, value))) {
    errors.push(`${valuePath} must be one of ${schema.enum.map((candidate) => JSON.stringify(candidate)).join(', ')}`);
  }

  if (schema.type) {
    const typeError = validateType(value, schema.type, valuePath);
    if (typeError) {
      errors.push(typeError);
      return;
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${valuePath} must be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${valuePath} must be <= ${schema.maximum}`);
    }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${valuePath} must have length >= ${schema.minLength}`);
    }
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(`${valuePath} must match pattern ${schema.pattern}`);
      }
    }
    if (schema.format === 'uri' && !isAbsoluteUrl(value)) {
      errors.push(`${valuePath} must be a well-formed absolute URL`);
    }
    if (schema.format === 'date' && !isDateString(value)) {
      errors.push(`${valuePath} must be a valid YYYY-MM-DD date`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${valuePath} must contain at least ${schema.minItems} item(s)`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${valuePath} must contain no more than ${schema.maxItems} item(s)`);
    }
    if (schema.items) {
      value.forEach((child, index) => {
        collectSchemaErrors(child, schema.items, `${valuePath}[${index}]`, errors);
      });
    }
  }

  if (isPlainObject(value)) {
    const properties = schema.properties ?? {};
    const required = schema.required ?? [];

    for (const key of required) {
      if (!(key in value)) {
        errors.push(`${valuePath}.${key} is required`);
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) {
        collectSchemaErrors(child, properties[key], `${valuePath}.${key}`, errors);
        continue;
      }

      if (schema.additionalProperties === false) {
        errors.push(`${valuePath}.${key} is not allowed`);
        continue;
      }

      if (isPlainObject(schema.additionalProperties)) {
        collectSchemaErrors(child, schema.additionalProperties, `${valuePath}.${key}`, errors);
      }
    }
  }
}

function matchesSchema(value, schema) {
  const errors = [];
  collectSchemaErrors(value, schema, '$', errors);
  return errors.length === 0;
}

function validateType(value, expectedType, valuePath) {
  switch (expectedType) {
    case 'array':
      return Array.isArray(value) ? null : `${valuePath} must be an array`;
    case 'object':
      return isPlainObject(value) ? null : `${valuePath} must be an object`;
    case 'string':
      return typeof value === 'string' ? null : `${valuePath} must be a string`;
    case 'integer':
      return Number.isInteger(value) ? null : `${valuePath} must be an integer`;
    case 'boolean':
      return typeof value === 'boolean' ? null : `${valuePath} must be a boolean`;
    default:
      return null;
  }
}
