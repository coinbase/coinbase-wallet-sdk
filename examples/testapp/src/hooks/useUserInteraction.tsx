import { useState } from 'react';

interface UseUserInteractionReturn {
  isModalOpen: boolean;
  currentTestName: string;
  requestUserInteraction: (testName: string, skipModal?: boolean) => Promise<void>;
  handleContinue: () => void;
  handleCancel: () => void;
}

export function useUserInteraction(): UseUserInteractionReturn {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTestName, setCurrentTestName] = useState('');
  const [resolver, setResolver] = useState<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);

  const requestUserInteraction = (testName: string, skipModal = false): Promise<void> => {
    // If skipModal is true, immediately resolve without showing the modal
    if (skipModal) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      setCurrentTestName(testName);
      setIsModalOpen(true);
      setResolver({ resolve, reject });
    });
  };

  const handleContinue = () => {
    setIsModalOpen(false);
    resolver?.resolve();
    setResolver(null);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    resolver?.reject(new Error('Test cancelled by user'));
    setResolver(null);
  };

  return {
    isModalOpen,
    currentTestName,
    requestUserInteraction,
    handleContinue,
    handleCancel,
  };
}
