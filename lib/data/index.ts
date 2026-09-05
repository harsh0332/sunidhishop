import { IProductRepository } from './product-repository.interface';
import { mockProductRepository } from './mock-product-repository';
import { GoogleSheetsProductProvider } from './google-sheets-provider';

/**
 * Factory to retrieve the active ProductDataProvider / ProductRepository.
 * Automatically selects GoogleSheetsProductProvider when GOOGLE_SHEET_ID is set
 * or DATA_SOURCE === 'google-sheets'. Otherwise gracefully defaults to the rich mock repository.
 */
export function getProductRepository(): IProductRepository {
  const dataSource = process.env.DATA_SOURCE || 'google-sheets';

  if (dataSource === 'mock') {
    return mockProductRepository;
  }

  return new GoogleSheetsProductProvider();
}

export const productRepository = getProductRepository();
export * from './product-repository.interface';
export * from './google-sheets-provider';
export * from './product-validator';
export * from './mock-products';
export * from './content-repository';
