/** @jsx jsx */

import { jsx, css } from '@emotion/core';
import { useState, ChangeEvent, FormEvent, Fragment } from 'react';

// components
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import TextInput, { formStyle } from '../../components/TextInput/TextInput';
import Icon from '../../components/Icon/Icon';
import theme, { remCalc } from '../../themes';
import useModal from '../../components/Modal/Modal';
import Loading from '../../components/Loading/Loading';

// Model
import ProgramModel from '../../models/ProgramModel';

// others
import { ValidationError } from 'joi';

export type Program = {
  id?: string;
  title: string;
  createdAt: Date;
  prerequisiteProgramId?: string;
  traineeCount: number;
  durationInWeeks: number;
};

type FormErrors = {
  title: string;
  prerequisiteProgramId: string;
  durationInWeeks: string;
};

/**
 * Style declarations
 */
const programPageStyle = css`
  .toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: ${remCalc(30)};
  }

  .programs {
    display: grid;
    grid-template-rows: repeat(3, 1fr);
    grid-template-columns: repeat(3, 1fr);
    grid-row-gap: 2rem;
    grid-column-gap: 1rem;

    .program {
      grid-row: auto / span 1;
      grid-column: auto / span 1;
    }
  }
`;

/**
 * Generate Modal content
 *
 * @params {Array} programs
 * @param {Function} updatePrograms
 * @returns {HTMLElement}
 */
const getModalContent = (
  programs: Program[],
  updatePrograms: (programs: Program[]) => void,
  errors: FormErrors,
  updateErrors: Function,
  newProgram: Program,
  updateNewProgram: Function,
  isCreatingProgram: boolean,
  updateCreatingProgramStatus: Function,
  toggleModal: Function
) => {
  const newProgramOnChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    newProgram = { ...newProgram, [event.target.name]: event.target.value };
  };

  const addNewProgramHandler = async ($event: FormEvent) => {
    try {
      $event.preventDefault();
      updateCreatingProgramStatus(true);
      const docRef = await ProgramModel.create(newProgram);
      toggleModal();
      updateCreatingProgramStatus(false);
      updatePrograms([...programs, { ...newProgram, id: docRef.id }]);
      updateErrors({});
    } catch (err) {
      if (err instanceof ValidationError) {
        updateCreatingProgramStatus(false);
        // persist the newProgram data thus far so we don't lose it on the page update
        updateNewProgram(newProgram);

        // stanardize and shorten error message to use "field" as opposed tp actial name
        const errorMessage = err.message.replace(/^".+"/, 'Field');
        updateErrors({ [err.details[0].path[0]]: errorMessage });
      }
    }
  };

  return (
    <form css={formStyle} onSubmit={addNewProgramHandler}>
      <section className='grid-area'>
        <div className='col'>
          <TextInput
            name='title'
            placeholder='Program Name'
            iconProps={{ title: 'programs' }}
            onChange={newProgramOnChangeHandler}
            error={errors['title']}
          />
        </div>
        <div className='col'>
          <TextInput
            name='durationInWeeks'
            type='number'
            placeholder='Duration In Weeks'
            onChange={newProgramOnChangeHandler}
            error={errors['durationInWeeks']}
          />
        </div>
        <div className='col'>
          <TextInput
            name='prerequisiteProgramId'
            placeholder='Pre-requisite Program'
            disabled={programs.length === 0}
            error={errors['prerequisiteProgramId']}
          />
        </div>
      </section>
      <section className='row submit'>
        <Button disabled={isCreatingProgram}>
          {!isCreatingProgram ? 'Create Program' : 'Please Wait...'}
        </Button>
      </section>
    </form>
  );
};

const ProgramsPage = () => {
  let [programs, updatePrograms] = useState<Program[]>([]);
  const [isLoading, updateLoadingStatus] = useState(true);
  const [isCreatingProgram, updateCreatingProgramStatus] = useState(false);
  const [errors, updateErrors] = useState({
    title: '',
    prerequisiteProgramId: '',
    durationInWeeks: '',
  });
  const [newProgram, updateNewProgram] = useState({
    title: '',
    prerequisiteProgramId: '',
    createdAt: new Date(),
    traineeCount: 0,
    durationInWeeks: 2,
  });
  const { Modal, toggleModal } = useModal(
    'Create A New Program',
    'The ATLP is made up of a series of inter-connected sub programs.',
    (injectedToggleModal: Function) =>
      getModalContent(
        programs,
        updatePrograms,
        errors,
        updateErrors,
        newProgram,
        updateNewProgram,
        isCreatingProgram,
        updateCreatingProgramStatus,
        injectedToggleModal
      )
  );

  if (isLoading) {
    ProgramModel.getAll()
      .then((programsCollectionSnapshot) => {
        let existingPrograms: any[] = [];
        programsCollectionSnapshot.forEach((program) => {
          // convert from Firestore Timestamp type
          existingPrograms = [...existingPrograms, program.data()];
          existingPrograms[existingPrograms.length - 1].createdAt = new Date(
            existingPrograms[existingPrograms.length - 1].createdAt.toDate()
          );
        });

        updatePrograms(existingPrograms);
      })
      .catch((err) => {
        console.log(err.message);
      })
      .finally(() => {
        updateLoadingStatus(false);
      });

    return (
      <Fragment>
        <div className='empty-state'>
          <Loading />
        </div>
      </Fragment>
    );
  }

  if (programs.length === 0 && !isLoading) {
    return (
      <Fragment>
        <div className='empty-state'>
          <Icon
            width={55}
            height={50}
            viewBox={{ width: 35, height: 40 }}
            fill={theme['primary-500']}
            name='programs'
          />
          <h4 className='title'>There are no available programs</h4>
          <p className='desc'>Go ahead, create one!</p>
          <Button onClick={toggleModal}>Create A New Program</Button>
        </div>

        {/* Modal Content */}
        {Modal}
      </Fragment>
    );
  }

  return (
    <Fragment>
      <div css={programPageStyle}>
        <div className='toolbar'>
          <Button onClick={toggleModal}>Create A New Program</Button>
        </div>

        <div className='programs'>
          {programs.map((program) => (
            <div className='program' key={program.title}>
              <Card
                traineeCount={program.traineeCount}
                title={program.title}
                createdAt={program.createdAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Modal Content */}
      {Modal}
    </Fragment>
  );
};

export default ProgramsPage;
