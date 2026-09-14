import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiUrl } from "../../context/auth";

const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    fetch(getApiUrl("/api/departments"), { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to load departments");
        }

        return result.departments || [];
      })
      .then(setDepartments)
      .catch((loadError) => setError(loadError.message));
  }, []);

  const startEdit = (department) => {
    setEditingId(department.id);
    setEditName(department.name);
    setEditDescription(department.description || "");
  };

  const updateDepartment = async (id) => {
    try {
      const response = await fetch(getApiUrl(`/api/departments/${id}`), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update department");
      }

      setDepartments((current) =>
        current.map((department) =>
          department.id === id
            ? {
                ...department,
                name: editName,
                description: editDescription,
              }
            : department,
        ),
      );

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

      setDepartments((current) =>
        current.filter((department) => department.id !== id),
      );
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

      <div className="flex justify-between items-center p-4">
        <input
          type="text"
          placeholder="Search by department name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="px-4 py-0.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <Link
          to="/department/add"
          className="px-4 py-1 bg-teal-500 text-white rounded hover:bg-teal-600"
        >
          Add New Department
        </Link>
      </div>

      {error && <p className="px-4 text-red-600">{error}</p>}

      <div className="px-4">
        {filteredDepartments.length ? (
          filteredDepartments.map((department) => (
            <article
              key={department.id}
              className="border-b border-gray-200 py-4"
            >
              {editingId === department.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="block w-full mb-2 px-3 py-2 border rounded"
                  />

                  <textarea
                    value={editDescription}
                    onChange={(event) =>
                      setEditDescription(event.target.value)
                    }
                    className="block w-full mb-2 px-3 py-2 border rounded"
                  />

                  <button
                    onClick={() => updateDepartment(department.id)}
                    className="mr-2 px-3 py-1 bg-blue-500 text-white rounded"
                  >
                    Save
                  </button>

                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 bg-gray-500 text-white rounded"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <h4 className="font-semibold">{department.name}</h4>

                  {department.description && (
                    <p className="text-gray-600">{department.description}</p>
                  )}

                  <button
                    onClick={() => startEdit(department)}
                    className="mt-2 mr-2 px-3 py-1 bg-yellow-500 text-white rounded"
                  >
                    Update
                  </button>

                  <button
                    onClick={() => deleteDepartment(department.id)}
                    className="mt-2 px-3 py-1 bg-red-500 text-white rounded"
                  >
                    Delete
                  </button>
                </>
              )}
            </article>
          ))
        ) : (
          <p className="text-gray-600">No departments found.</p>
        )}
      </div>
    </div>
  );
};

export default Department;