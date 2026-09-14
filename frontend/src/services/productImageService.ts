// Product Image Service
// Maps product categories to appropriate images from Ressichem website

interface CategoryImageMap {
  [key: string]: {
    imageUrl: string;
    altText: string;
    category: string;
    subcategory?: string;
  };
}

class ProductImageService {
  private static instance: ProductImageService;
  private categoryImageMap: CategoryImageMap = {};

  private constructor() {
    this.initializeImageMap();
  }

  public static getInstance(): ProductImageService {
    if (!ProductImageService.instance) {
      ProductImageService.instance = new ProductImageService();
    }
    return ProductImageService.instance;
  }

  private initializeImageMap() {
    // Base URL for Ressichem product images
    const baseUrl = 'https://ressichem.com';
    
    this.categoryImageMap = {
      // Dry Mix Mortars / Premix Plasters
      'Dry Mix Mortars': {
        imageUrl: `${baseUrl}/images/products/dry-mix-mortars.jpg`,
        altText: 'Dry Mix Mortars and Premix Plasters',
        category: 'Dry Mix Mortars / Premix Plasters'
      },
      'Premix Plasters': {
        imageUrl: `${baseUrl}/images/products/premix-plasters.jpg`,
        altText: 'Premix Plasters',
        category: 'Dry Mix Mortars / Premix Plasters'
      },

      // Epoxy Floorings & Coatings
      'Epoxy Floorings': {
        imageUrl: `${baseUrl}/images/products/epoxy-floorings.jpg`,
        altText: 'Epoxy Floorings and Coatings',
        category: 'Epoxy Floorings & Coatings'
      },
      'Epoxy Coatings': {
        imageUrl: `${baseUrl}/images/products/epoxy-coatings.jpg`,
        altText: 'Epoxy Coatings',
        category: 'Epoxy Floorings & Coatings'
      },
      'Epoxy Crack Fillers': {
        imageUrl: `${baseUrl}/images/products/epoxy-crack-fillers.jpg`,
        altText: 'Epoxy Crack Fillers',
        category: 'Epoxy Floorings & Coatings',
        subcategory: 'Epoxy Crack Fillers'
      },
      'Epoxy Primers': {
        imageUrl: `${baseUrl}/images/products/epoxy-primers.jpg`,
        altText: 'Epoxy Primers',
        category: 'Epoxy Floorings & Coatings',
        subcategory: 'Epoxy Primers'
      },
      'Epoxy Mid Coats': {
        imageUrl: `${baseUrl}/images/products/epoxy-mid-coats.jpg`,
        altText: 'Epoxy Mid Coats',
        category: 'Epoxy Floorings & Coatings',
        subcategory: 'Epoxy Mid Coats'
      },
      'Cementitious Screeds': {
        imageUrl: `${baseUrl}/images/products/cementitious-screeds.jpg`,
        altText: 'Cementitious Screeds and Repair Materials',
        category: 'Epoxy Floorings & Coatings',
        subcategory: 'Cementitious Screeds and Repair Materials'
      },
      'Two Component Epoxy': {
        imageUrl: `${baseUrl}/images/products/two-component-epoxy.jpg`,
        altText: 'Two Component Epoxy Top Coats',
        category: 'Epoxy Floorings & Coatings',
        subcategory: 'Two Component Epoxy Top Coats'
      },
      'Three Component Epoxy': {
        imageUrl: `${baseUrl}/images/products/three-component-epoxy.jpg`,
        altText: 'Three Component Heavy Duty Epoxy Floorings',
        category: 'Epoxy Floorings & Coatings',
        subcategory: 'Three Component Heavy Duty Epoxy Floorings'
      },

      // Building Care & Maintenance
      'Building Care': {
        imageUrl: `${baseUrl}/images/products/building-care.jpg`,
        altText: 'Building Care and Maintenance',
        category: 'Building Care & Maintenance'
      },
      'Maintenance': {
        imageUrl: `${baseUrl}/images/products/maintenance.jpg`,
        altText: 'Building Maintenance',
        category: 'Building Care & Maintenance'
      },

      // Epoxy Adhesives and Coatings
      'Epoxy Adhesives': {
        imageUrl: `${baseUrl}/images/products/epoxy-adhesives.jpg`,
        altText: 'Epoxy Adhesives and Coatings',
        category: 'Epoxy Adhesives and Coatings'
      },
      'Resins': {
        imageUrl: `${baseUrl}/images/products/resins.jpg`,
        altText: 'Epoxy Resins',
        category: 'Epoxy Adhesives and Coatings',
        subcategory: 'Resins'
      },
      'Hardeners': {
        imageUrl: `${baseUrl}/images/products/hardeners.jpg`,
        altText: 'Epoxy Hardeners',
        category: 'Epoxy Adhesives and Coatings',
        subcategory: 'Hardeners'
      },
      'Mixed Formulated Systems': {
        imageUrl: `${baseUrl}/images/products/mixed-systems.jpg`,
        altText: 'Mixed Formulated Systems',
        category: 'Epoxy Adhesives and Coatings',
        subcategory: 'Mixed Formulated Systems'
      },
      'Additives': {
        imageUrl: `${baseUrl}/images/products/additives.jpg`,
        altText: 'Epoxy Additives',
        category: 'Epoxy Adhesives and Coatings',
        subcategory: 'Additives'
      },

      // Tiling and Grouting Materials
      'Tiling': {
        imageUrl: `${baseUrl}/images/products/tiling.jpg`,
        altText: 'Tiling and Grouting Materials',
        category: 'Tiling and Grouting Materials'
      },
      'Grouting': {
        imageUrl: `${baseUrl}/images/products/grouting.jpg`,
        altText: 'Grouting Materials',
        category: 'Tiling and Grouting Materials'
      },
      'Tile Adhesives': {
        imageUrl: `${baseUrl}/images/products/tile-adhesives.jpg`,
        altText: 'Tile Adhesives',
        category: 'Tiling and Grouting Materials',
        subcategory: 'Tile Adhesives'
      },
      'Cement-Based': {
        imageUrl: `${baseUrl}/images/products/cement-based.jpg`,
        altText: 'Cement-Based Tile Adhesives',
        category: 'Tiling and Grouting Materials',
        subcategory: 'Cement-Based'
      },

      // Concrete Admixtures
      'Concrete Admixtures': {
        imageUrl: `${baseUrl}/images/products/concrete-admixtures.jpg`,
        altText: 'Concrete Admixtures',
        category: 'Concrete Admixtures'
      },

      // Building Insulation
      'Building Insulation': {
        imageUrl: `${baseUrl}/images/products/building-insulation.jpg`,
        altText: 'Building Insulation',
        category: 'Building Insulation'
      },

      // Decorative Concrete
      'Decorative Concrete': {
        imageUrl: `${baseUrl}/images/products/decorative-concrete.jpg`,
        altText: 'Decorative Concrete',
        category: 'Decorative Concrete'
      },

      // Specialty Products
      'Specialty Products': {
        imageUrl: `${baseUrl}/images/products/specialty-products.jpg`,
        altText: 'Specialty Products',
        category: 'Specialty Products'
      },

      // Default fallback
      'default': {
        imageUrl: `${baseUrl}/images/products/default-product.jpg`,
        altText: 'Ressichem Product',
        category: 'General'
      }
    };
  }

  /**
   * Get product image based on category
   */
  public getProductImage(category: string | any): {
    imageUrl: string;
    altText: string;
    category: string;
  } {
    let categoryKey = 'default';
    
    if (typeof category === 'string') {
      categoryKey = this.findBestMatch(category);
    } else if (typeof category === 'object' && category) {
      // Handle different category object structures
      if (category.name) {
        categoryKey = this.findBestMatch(category.name);
      } else if (category.mainCategory) {
        categoryKey = this.findBestMatch(category.mainCategory);
        if (category.subCategory) {
          const subKey = this.findBestMatch(category.subCategory);
          if (subKey !== 'default') {
            categoryKey = subKey;
          }
        }
      }
    }

    const imageData = this.categoryImageMap[categoryKey] || this.categoryImageMap['default'];
    
    return {
      imageUrl: imageData.imageUrl,
      altText: imageData.altText,
      category: imageData.category
    };
  }

  /**
   * Find best matching category key
   */
  private findBestMatch(categoryString: string): string {
    if (!categoryString) return 'default';
    
    const normalizedCategory = categoryString.toLowerCase().trim();
    
    // Direct matches first
    for (const key of Object.keys(this.categoryImageMap)) {
      if (key.toLowerCase() === normalizedCategory) {
        return key;
      }
    }
    
    // Partial matches
    for (const key of Object.keys(this.categoryImageMap)) {
      if (key.toLowerCase().includes(normalizedCategory) || 
          normalizedCategory.includes(key.toLowerCase())) {
        return key;
      }
    }
    
    // Check for specific keywords
    const keywords = [
      'epoxy', 'tile', 'adhesive', 'grout', 'mortar', 'plaster', 
      'concrete', 'insulation', 'decorative', 'specialty', 'building'
    ];
    
    for (const keyword of keywords) {
      if (normalizedCategory.includes(keyword)) {
        for (const key of Object.keys(this.categoryImageMap)) {
          if (key.toLowerCase().includes(keyword)) {
            return key;
          }
        }
      }
    }
    
    return 'default';
  }

  /**
   * Get all available category images
   */
  public getAllCategoryImages(): Array<{
    key: string;
    imageUrl: string;
    altText: string;
    category: string;
    subcategory?: string;
  }> {
    return Object.entries(this.categoryImageMap).map(([key, value]) => ({
      key,
      ...value
    }));
  }

  /**
   * Add custom image mapping
   */
  public addCustomMapping(categoryKey: string, imageData: {
    imageUrl: string;
    altText: string;
    category: string;
    subcategory?: string;
  }) {
    this.categoryImageMap[categoryKey] = imageData;
  }

  /**
   * Get image for specific product name
   */
  public getProductImageByName(productName: string, category?: string | any): {
    imageUrl: string;
    altText: string;
    category: string;
  } {
    const normalizedName = productName.toLowerCase();
    
    // Check for specific product keywords
    if (normalizedName.includes('tile adhesive') || normalizedName.includes('tile glue')) {
      return this.categoryImageMap['Tile Adhesives'];
    }
    
    if (normalizedName.includes('epoxy') && normalizedName.includes('adhesive')) {
      return this.categoryImageMap['Epoxy Adhesives'];
    }
    
    if (normalizedName.includes('grout')) {
      return this.categoryImageMap['Grouting'];
    }
    
    if (normalizedName.includes('mortar')) {
      return this.categoryImageMap['Dry Mix Mortars'];
    }
    
    if (normalizedName.includes('plaster')) {
      return this.categoryImageMap['Premix Plasters'];
    }
    
    if (normalizedName.includes('epoxy') && normalizedName.includes('floor')) {
      return this.categoryImageMap['Epoxy Floorings'];
    }
    
    if (normalizedName.includes('concrete')) {
      return this.categoryImageMap['Concrete Admixtures'];
    }
    
    // Fall back to category-based matching
    return this.getProductImage(category);
  }
}

// Export singleton instance
export default ProductImageService;
export const productImageService = ProductImageService.getInstance();
