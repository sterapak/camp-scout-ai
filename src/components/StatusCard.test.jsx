import { render } from '@testing-library/react';
import { StatusCard } from './StatusCard';
import { FiCheckCircle } from 'react-icons/fi';

describe('StatusCard', () => {
  it('renders without crashing', () => {
    render(
      <StatusCard
        icon={<FiCheckCircle />}
        count={5}
        label="Completed"
        onClick={jest.fn()}
      />
    );
  });
}); 