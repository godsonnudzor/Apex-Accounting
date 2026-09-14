import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiUrl } from "../../context/auth";

const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await fetch(getApiUrl("/api/departments"), {
          credentials: "include",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to load departments");
        }

        const loadedDepartments = result.departments || [];
        setDepartments(loadedDepartments);
        setSelectedDepartment(loadedDepartments[0] || null);
      } catch (loadError) {
        setError(loadError.message);
      }
    };

    loadDepartments();
  }, []);

  const startEdit = (department) => {
    setEditingId(department.id);
    setEditName(department.name);
    setEditDescription(department.description || "");
    setError("");
  };

  const updateDepartment = async (id) => {
    const name = editName.trim();
    const description = editDescription.trim();

    if (!name) {
      setError("Department name is required");
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/departments/${id}`), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update department");
      }

      const updatedDepartment = result.department || {
        ...selectedDepartment,
        id,
        name,
        description,
      };

      setDepartments((current) =>
        current.map((department) =>
          department.id === id ? updatedDepartment : department,
        ),
      );

      setSelectedDepartment(updatedDepartment);
      setEditingId(null);
      setError("");
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const deleteDepartment = async (id) => {
    if (!window.confirm("Delete this department?")) return;

    try {
      const response = await fetch(getApiUrl(`/api/departments/${id}`), {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete department");
      }

      const remainingDepartments = departments.filter(
        (department) => department.id !== id,
      );

      setDepartments(remainingDepartments);
      setSelectedDepartment(remainingDepartments[0] || null);
      setEditingId(null);
      setError("");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const filteredDepartments = departments.filter((department) =>
    department.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="p-5">
      <div className="text-center">
        <h3 className="text-2xl font-bold">Manage Departments</h3>
      </div>

      <div className="flex items-center justify-between gap-4 p-4">
        <input
          type="text"
          placeholder="Search by department name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <Link
          to="/department/add"
          className="rounded bg-teal-500 px-4 py-2 text-white hover:bg-teal-600"
        >
          Add New Department
        </Link>
      </div>

      {error && <p className="px-4 pb-3 text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-6 px-4 md:grid-cols-3">
        <div className="overflow-hidden rounded-lg border md:col-span-1">
          {filteredDepartments.length ? (
            filteredDepartments.map((department) => (
              <button
                key={department.id}
                onClick={() => {
                  setSelectedDepartment(department);
                  setEditingId(null);
                }}
                className={`block w-full border-b p-4 text-left transition hover:bg-teal-50 ${
                  selectedDepartment?.id === department.id
                    ? "border-l-4 border-l-teal-500 bg-teal-50"
                    : ""
                }`}
              >
                <h4 className="font-semibold">{department.name}</h4>
                <p className="mt-1 text-sm text-gray-500">
                  {department.description || "No description"}
                </p>
              </button>
            ))
          ) : (
            <p className="p-4 text-gray-600">No departments found.</p>
          )}
        </div>

        <div className="rounded-lg border p-6 md:col-span-2">
          {selectedDepartment ? (
            editingId === selectedDepartment.id ? (
              <>
                <h3 className="mb-4 text-xl font-bold">Update Department</h3>

                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="mb-3 w-full rounded border px-3 py-2"
                  placeholder="Department name"
                />

                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="mb-4 w-full rounded border px-3 py-2"
                  placeholder="Description"
                  rows="5"
                />

                <button
                  onClick={() => updateDepartment(selectedDepartment.id)}
                  className="mr-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  Save
                </button>

                <button
                  onClick={() => setEditingId(null)}
                  className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h3 className="mb-3 text-2xl font-bold">
                  {selectedDepartment.name}
                </h3>

                <p className="mb-6 text-gray-600">
                  {selectedDepartment.description || "No description available."}
                </p>

                <button
                  onClick={() => startEdit(selectedDepartment)}
                  className="mr-2 rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
                >
                  Update
                </button>

                <button
                  onClick={() => deleteDepartment(selectedDepartment.id)}
                  className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </>
            )
          ) : (
            <p className="text-gray-600">
              Select a department to view its details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Department;