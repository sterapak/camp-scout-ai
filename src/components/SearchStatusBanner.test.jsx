import { render } from '@testing-library/react';
import * as store from '../store/useAppStore';
import SearchStatusBanner from './SearchStatusBanner';

describe('SearchStatusBanner', () => {
  beforeAll(() => {
    jest.spyOn(store, 'useAppStore').mockImplementation((selector) => selector({ status: 'active' }));
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  it('renders without crashing', () => {
    render(<SearchStatusBanner />);
  });
}); 