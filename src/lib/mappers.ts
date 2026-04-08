/**
 * Utilitários para conversão entre snake_case (Supabase) e camelCase (TypeScript)
 */

export const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/([-_][a-z])/g, group =>
        group.toUpperCase().replace('-', '').replace('_', '')
      );
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

export const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// Mappers específicos para garantir consistência
export const mapClientToDB = (client: any) => toSnakeCase(client);
export const mapClientFromDB = (client: any) => toCamelCase(client);

export const mapSupplierToDB = (supplier: any) => toSnakeCase(supplier);
export const mapSupplierFromDB = (supplier: any) => toCamelCase(supplier);

export const mapProductToDB = (product: any) => toSnakeCase(product);
export const mapProductFromDB = (product: any) => toCamelCase(product);

export const mapOrderToDB = (order: any) => toSnakeCase(order);
export const mapOrderFromDB = (order: any) => toCamelCase(order);

export const mapTransactionToDB = (transaction: any) => toSnakeCase(transaction);
export const mapTransactionFromDB = (transaction: any) => toCamelCase(transaction);

export const mapOrdemServicoToDB = (os: any) => toSnakeCase(os);
export const mapOrdemServicoFromDB = (os: any) => toCamelCase(os);
