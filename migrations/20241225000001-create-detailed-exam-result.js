"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create DetailedExamResults table
    await queryInterface.createTable("DetailedExamResults", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      appointment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Appointments",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Doctors",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      hospital_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Hospitals",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      medical_history: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      disease_progression: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      pulse: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      temperature: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      blood_pressure: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      skin_condition: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mucous_membrane: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      organ_examination: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      diagnosis: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      treatment_direction: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      exam_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      is_completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Create TestResults table
    await queryInterface.createTable("TestResults", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      detailed_exam_result_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "DetailedExamResults",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Create DetailedPrescriptions table
    await queryInterface.createTable("DetailedPrescriptions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      detailed_exam_result_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "DetailedExamResults",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      medication: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes
    await queryInterface.addIndex("DetailedExamResults", ["appointment_id"]);
    await queryInterface.addIndex("DetailedExamResults", ["doctor_id"]);
    await queryInterface.addIndex("DetailedExamResults", ["hospital_id"]);
    await queryInterface.addIndex("TestResults", ["detailed_exam_result_id"]);
    await queryInterface.addIndex("DetailedPrescriptions", [
      "detailed_exam_result_id",
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("DetailedPrescriptions");
    await queryInterface.dropTable("TestResults");
    await queryInterface.dropTable("DetailedExamResults");
  },
};
